// The pattern effect engine: turns the effects' cell colours into DMX values on top of the static values.
// Effect files only say "cell (col,row) is this colour at step N"; everything DMX lives here.
// Pure: no React, no clocks. The caller passes the time.

import type { Cue } from "../../types-v2/cue";
import type { FixtureGroup, Grid } from "../../types-v2/fixtureGroups";
import type { FixtureTemplate } from "../../types-v2/fixtureTemplates";
import { BlendMode, SelectableType, type OptionSet, type PatternSelectable } from "../../types-v2/optionSet";
import type { PatchedFixture } from "../../types-v2/patchedFixture";
import {
  getActiveSelectables,
  getColourFromRgb,
  parseHex,
  type DmxValuesByFixtureId,
} from "../../utils/visualiser-v2-resolver";
import { BLACK, WHITE, type PatternEffectDefinition, type Rgb } from "./patternEffect";
import { getPatternEffect } from "./registry";

/** A pattern selectable picked in the cue, with the grid of the group it belongs to. */
export type ActivePattern = { selectable: PatternSelectable; grid: Grid | null };

/** How often the clock ticks while a fade is running. */
const FADE_FRAME_MS = 1000 / 30;

/** The pattern selectables picked in this cue, in write order. */
export const getActivePatterns = (
  cue: Cue,
  fixtureGroups: FixtureGroup[],
  optionSetsByGroupId: Record<string, OptionSet[]>,
): ActivePattern[] => {
  const gridByGroupId = new Map(fixtureGroups.map((g) => [g.id, g.grid]));
  return getActiveSelectables(cue, fixtureGroups, optionSetsByGroupId).flatMap(({ selectable, fixtureGroupId }) =>
    selectable.type === SelectableType.EFFECT_PATTERN
      ? [{ selectable, grid: gridByGroupId.get(fixtureGroupId) ?? null }]
      : [],
  );
};

/**
 * Milliseconds until the pattern output can next change, for the clock.
 * During a fade: one frame. Otherwise: until the next step starts. `Infinity` = never (nothing animates).
 */
export const getNextPatternChangeDelay = (patterns: ActivePattern[], timeMs: number): number => {
  let delay = Infinity;
  for (const { selectable } of patterns) {
    const stepMs = selectable.stepDuration;
    if (!(stepMs > 0)) continue; // no valid step length: the effect never moves on
    const intoStep = timeMs % stepMs;
    const longestFade = Math.max(selectable.fadeInDuration || 0, selectable.fadeOutDuration || 0);
    if (intoStep < longestFade) return FADE_FRAME_MS;
    delay = Math.min(delay, stepMs - intoStep);
  }
  return delay;
};

export type ApplyPatternEffectsInput = {
  /** The static values from getDmxValues. Not changed; a new object is returned. */
  base: DmxValuesByFixtureId;
  patterns: ActivePattern[];
  fixtures: PatchedFixture[];
  fixtureTemplates: FixtureTemplate[];
  /** Milliseconds since the cue started. */
  timeMs: number;
};

/**
 * Applies each pattern in order on top of `base`. Only colour channels are written; dimmers and everything else
 * keep their static values. Anything broken (unknown effect id, no grid, a cell whose fixture or head is gone,
 * an effect that throws) is skipped, never thrown.
 */
export const applyPatternEffects = (input: ApplyPatternEffectsInput): DmxValuesByFixtureId => {
  const { base, patterns, fixtures, fixtureTemplates, timeMs } = input;
  if (patterns.length === 0) return base; // nothing to do: keep the same object

  const result: DmxValuesByFixtureId = { ...base };
  const copied = new Set<string>(); // fixtures whose array has been copied already, so base is never changed
  const fixtureById = new Map(fixtures.map((f) => [f.id, f]));
  const templateById = new Map(fixtureTemplates.map((t) => [t.id, t]));
  const channelsByTemplateId = new Map(
    fixtureTemplates.map((t) => [t.id, new Map(t.channels.map((c) => [c.id, c]))]),
  );

  for (const pattern of patterns) {
    const { selectable, grid } = pattern;
    const effect = getPatternEffect(selectable.effect);
    if (!effect || !grid || grid.cells.length === 0) continue;

    let cellColours: Map<string, Rgb>;
    try {
      cellColours = getCellColours(effect, selectable, grid, timeMs);
    } catch (error) {
      console.warn(`Pattern effect "${effect.id}" threw; skipping it`, error);
      continue;
    }

    for (const cell of grid.cells) {
      if (selectable.fixtureIds !== "all" && !selectable.fixtureIds.includes(cell.fixtureId)) continue;
      const colour = cellColours.get(cellKey(cell.col, cell.row));
      if (!colour) continue;

      const fixture = fixtureById.get(cell.fixtureId);
      const template = fixture && templateById.get(fixture.fixtureTemplateId);
      const mode = template?.modes.find((m) => m.id === fixture!.modeId);
      if (!fixture || !template || !mode || !result[fixture.id]) continue;

      // The head's DMX slots. No heads = one head with every channel.
      const slots =
        mode.heads.length > 0 ? mode.heads[cell.head]?.channelIndexes : cell.head === 0 ? mode.channelIds.map((_, i) => i) : undefined;
      if (!slots) continue;

      const channelsById = channelsByTemplateId.get(template.id);
      const typeAt = (slot: number) => channelsById?.get(mode.channelIds[slot])?.type;
      const headTypes = slots.map(typeAt).filter((t) => t !== undefined);
      // Only colour channel types come back, so dimmers are never touched.
      const channelValues = getColourFromRgb(colour, headTypes);

      if (!copied.has(fixture.id)) {
        result[fixture.id] = [...result[fixture.id]];
        copied.add(fixture.id);
      }
      const values = result[fixture.id];
      for (const slot of slots) {
        const type = typeAt(slot);
        const effectValue = type === undefined ? undefined : channelValues[type];
        if (effectValue === undefined) continue;
        values[slot] = blend(selectable.blendMode, values[slot] ?? 0, effectValue);
      }
    }
  }

  return result;
};

/** Per channel, 0–255. `base` is what the static selectables (or an earlier pattern) wrote. */
const blend = (mode: BlendMode, base: number, effect: number): number => {
  switch (mode) {
    case BlendMode.MASK:
      return Math.round((base * effect) / 255);
    case BlendMode.ADDITIVE:
      return Math.min(base + effect, 255);
    case BlendMode.SUBTRACTIVE:
      return Math.max(base - effect, 0);
    case BlendMode.NORMAL:
    default:
      return effect;
  }
};

export const cellKey = (col: number, row: number) => `${col},${row}`;

/**
 * Every grid position's colour at `timeMs`, including the fade between the previous step and this one.
 * Off cells are black, so they still blend (e.g. go dark in normal and mask mode).
 * Keyed by `cellKey(col, row)`. Also used by the LD's pattern preview. May throw if the effect throws.
 */
export const getCellColours = (
  effect: PatternEffectDefinition,
  selectable: PatternSelectable,
  grid: Grid,
  timeMs: number,
): Map<string, Rgb> => {
  const { cols, rows } = grid;
  const stepCount = sanitiseStepCount(effect.stepCount({ cols, rows }));
  // An invalid step length means the effect stays on its first step.
  const stepMs = selectable.stepDuration > 0 ? selectable.stepDuration : Infinity;
  const stepIndex = Math.floor(timeMs / stepMs); // since the cue started, not wrapped
  const step = stepIndex % stepCount;
  const intoStep = timeMs % stepMs;

  const colours = getEffectColours(selectable, effect.colourCount);
  const colourAt = (col: number, row: number, s: number): Rgb | null =>
    sanitiseRgb(
      effect.colourAt({ col, row, cols, rows, step: s, stepCount, colours, random: seededRandom(s, col, row) }),
    );

  const fadeIn = selectable.fadeInDuration || 0;
  const fadeOut = selectable.fadeOutDuration || 0;
  const hasFades = fadeIn > 0 || fadeOut > 0;
  const previousStep = (step - 1 + stepCount) % stepCount;

  const result = new Map<string, Rgb>();
  for (const cell of grid.cells) {
    const key = cellKey(cell.col, cell.row);
    if (result.has(key)) continue;

    const current = colourAt(cell.col, cell.row, step);
    if (!hasFades) {
      result.set(key, current ?? BLACK);
      continue;
    }
    // Fade from the previous step's colour. The very first step fades up from black.
    const previous = stepIndex === 0 ? null : colourAt(cell.col, cell.row, previousStep);
    const fade = current ? fadeIn : fadeOut; // turning on/changing colour uses fade in; turning off uses fade out
    const progress = fade > 0 ? Math.min(1, intoStep / fade) : 1;
    result.set(key, mix(previous ?? BLACK, current ?? BLACK, progress));
  }
  return result;
};

/** The LD's colours as RGB, padded with white up to `colourCount`. */
const getEffectColours = (selectable: PatternSelectable, colourCount: number): Rgb[] => {
  const colours: Rgb[] = (selectable.colours ?? []).map((c) => parseHex(c.hex) ?? WHITE);
  while (colours.length < colourCount) colours.push(WHITE);
  return colours;
};

const sanitiseStepCount = (n: number) => (Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1);

const sanitiseRgb = (rgb: Rgb | null | undefined): Rgb | null => {
  if (!rgb) return null;
  const clamp = (v: number) => (Number.isFinite(v) ? Math.min(255, Math.max(0, Math.round(v))) : 0);
  return [clamp(rgb[0]), clamp(rgb[1]), clamp(rgb[2])];
};

const mix = (from: Rgb, to: Rgb, progress: number): Rgb => [
  Math.round(from[0] + (to[0] - from[0]) * progress),
  Math.round(from[1] + (to[1] - from[1]) * progress),
  Math.round(from[2] + (to[2] - from[2]) * progress),
];

/** A small seeded random generator (mulberry32), seeded by step and cell. */
const seededRandom = (step: number, col: number, row: number): (() => number) => {
  let state = (Math.imul(step + 1, 374761393) ^ Math.imul(col + 1, 668265263) ^ Math.imul(row + 1, 2246822519)) | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
