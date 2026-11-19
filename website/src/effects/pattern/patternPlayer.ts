// Compiled pattern effects, for evaluating every frame. Pure: no React, no clocks; the caller passes the time.
//
// Compile once when the cue or setup changes (which cells each pattern writes, which slots, which overrides), then
// call `evaluate(timeMs)` per frame. A step's colours are computed once, when the step starts; during a fade only the
// mix between the previous and current step runs. applyPatternEffects, getCellColours and getNextPatternChangeDelay
// are thin wrappers around this file, so their tests cover it.

import type { Grid } from "../../types-v2/fixtureGroups";
import { ChannelType, type FixtureTemplate } from "../../types-v2/fixtureTemplates";
import { BlendMode, type PatternSelectable } from "../../types-v2/optionSet";
import type { PatchedFixture } from "../../types-v2/patchedFixture";
import {
  applySlotPatches,
  getColourChannelValue,
  getWhiteShare,
  parseHex,
  type DmxValuesByFixtureId,
  type SlotPatch,
} from "../../utils/visualiser-v2-resolver";
import { BLACK, WHITE, resolvePatternParams, type PatternEffectDefinition, type Rgb } from "./patternEffect";
import { getPatternEffect } from "./registry";

/** A pattern selectable picked in the cue, with the grid of the group it belongs to. */
export type ActivePattern = { selectable: PatternSelectable; grid: Grid | null };

export const cellKey = (col: number, row: number) => `${col},${row}`;

// --- Timing ---

/**
 * Milliseconds until this selectable's output can next change. 0 = it changes every frame (a fade is running,
 * including the first step fading up from black). `Infinity` = never.
 */
export const getSelectableChangeDelay = (selectable: PatternSelectable, timeMs: number): number => {
  // An invalid step length means the effect stays on its first step (only its fade from black can move).
  const stepMs = selectable.stepDuration > 0 ? selectable.stepDuration : Infinity;
  const intoStep = timeMs % stepMs;
  const longestFade = Math.max(selectable.fadeInDuration || 0, selectable.fadeOutDuration || 0);
  if (intoStep < longestFade) return 0;
  return stepMs - intoStep;
};

// --- One pattern: cell colours over time ---

/**
 * One pattern's colours over time, for each distinct grid position. `rgb` holds the result of the last `evaluate`,
 * three numbers per position, in the order of `positions`.
 */
export type PatternTrack = {
  /** Distinct grid positions, in the order the grid's cells first mention them. */
  positions: { col: number; row: number }[];
  /** Position index by cellKey(col, row). */
  indexByKey: Map<string, number>;
  /** r, g, b per position (0–255), written by `evaluate`. */
  rgb: number[];
  /** Updates `rgb` for `timeMs`. Returns false when the colours can't have changed since the last call. May throw. */
  evaluate: (timeMs: number) => boolean;
  nextChangeDelay: (timeMs: number) => number;
};

/** May throw if the effect's stepCount throws. */
export const createPatternTrack = (
  effect: PatternEffectDefinition,
  selectable: PatternSelectable,
  grid: Grid,
): PatternTrack => {
  const { cols, rows } = grid;
  const params = resolvePatternParams(effect.params, selectable.params);
  const stepCount = sanitiseStepCount(effect.stepCount({ cols, rows, params }));
  const stepMs = selectable.stepDuration > 0 ? selectable.stepDuration : Infinity;
  const colours = getEffectColours(selectable, effect.colourCount);
  const fadeIn = selectable.fadeInDuration || 0;
  const fadeOut = selectable.fadeOutDuration || 0;
  const hasFades = fadeIn > 0 || fadeOut > 0;
  const longestFade = Math.max(fadeIn, fadeOut);

  const positions: { col: number; row: number }[] = [];
  const indexByKey = new Map<string, number>();
  for (const cell of grid.cells) {
    const key = cellKey(cell.col, cell.row);
    if (indexByKey.has(key)) continue;
    indexByKey.set(key, positions.length);
    positions.push({ col: cell.col, row: cell.row });
  }

  /** Every position's colour in step `s` (null = off). */
  const computeStep = (s: number): (Rgb | null)[] =>
    positions.map(({ col, row }) =>
      sanitiseRgb(
        effect.colourAt({
          col,
          row,
          cols,
          rows,
          step: s,
          stepCount,
          colours,
          random: seededRandom(s, col, row),
          params,
        }),
      ),
    );

  const rgb = new Array<number>(positions.length * 3).fill(0);
  let cachedStepIndex = -1;
  let current: (Rgb | null)[] = [];
  let previous: (Rgb | null)[] | null = null;
  let settled = false; // `rgb` already holds the final colours of the cached step

  const evaluate = (timeMs: number): boolean => {
    const stepIndex = Math.floor(timeMs / stepMs); // since the cue started, not wrapped
    const intoStep = timeMs % stepMs;

    if (stepIndex !== cachedStepIndex) {
      const step = stepIndex % stepCount;
      const previousStep = (step - 1 + stepCount) % stepCount;
      // Consecutive steps reuse the colours already computed for the step before.
      const nextPrevious = !hasFades || stepIndex === 0
        ? null
        : stepIndex === cachedStepIndex + 1
          ? current
          : computeStep(previousStep);
      current = computeStep(step);
      previous = nextPrevious;
      cachedStepIndex = stepIndex;
      settled = false;
    } else if (settled) {
      return false;
    }

    // As in QLC+: the previous step fades out while this one fades in, each on its own curve, and each channel takes
    // the higher of the two (HTP). The very first step fades up from black.
    const inLevel = fadeIn > 0 ? Math.min(1, intoStep / fadeIn) : 1;
    const outLevel = fadeOut > 0 ? 1 - Math.min(1, intoStep / fadeOut) : 0;
    for (let i = 0; i < positions.length; i++) {
      const to = current[i] ?? BLACK;
      if (!hasFades) {
        rgb[i * 3] = to[0];
        rgb[i * 3 + 1] = to[1];
        rgb[i * 3 + 2] = to[2];
        continue;
      }
      const from = previous?.[i] ?? BLACK;
      for (let c = 0; c < 3; c++) {
        rgb[i * 3 + c] = Math.round(Math.max(from[c] * outLevel, to[c] * inLevel));
      }
    }
    settled = intoStep >= longestFade;
    return true;
  };

  return {
    positions,
    indexByKey,
    rgb,
    evaluate,
    nextChangeDelay: (timeMs) => getSelectableChangeDelay(selectable, timeMs),
  };
};

/**
 * The LD's colours as RGB, padded up to `colourCount`: a missing first colour is white, any later one is black.
 * With the default MASK blend mode, white shows the base light and black turns it off, so a two-colour effect
 * (e.g. alternate) switches cells on and off instead of being white/white, which would change nothing.
 */
const getEffectColours = (selectable: PatternSelectable, colourCount: number): Rgb[] => {
  const colours: Rgb[] = (selectable.colours ?? []).map((c) => parseHex(c.hex) ?? WHITE);
  while (colours.length < colourCount) colours.push(colours.length === 0 ? WHITE : BLACK);
  return colours;
};

const sanitiseStepCount = (n: number) => (Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1);

const sanitiseRgb = (rgb: Rgb | null | undefined): Rgb | null => {
  if (!rgb) return null;
  const clamp = (v: number) => (Number.isFinite(v) ? Math.min(255, Math.max(0, Math.round(v))) : 0);
  return [clamp(rgb[0]), clamp(rgb[1]), clamp(rgb[2])];
};

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

// --- All patterns of a cue: DMX values over time ---

/** Per channel, 0–255. `base` is what the static selectables (or an earlier pattern) wrote. */
export const blend = (mode: BlendMode, base: number, effect: number): number => {
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

/**
 * MASK: the pattern colour is a filter over the base light, so a white cell keeps the base as it is and a black cell
 * turns it off. Done in light terms, not DMX terms: converting the pattern colour to DMX first (as `blend` does)
 * moves white onto W on RGBW heads and inverts CMY, so a white cell would black out a red base.
 *
 * One colour channel on its own. RGBW heads go through maskRgbw instead, since their white is shared with R, G, B.
 */
export const maskChannel = (type: ChannelType, base: number, rgb: readonly [number, number, number]): number => {
  const [r, g, b] = rgb;
  switch (type) {
    case ChannelType.RED:
      return Math.round((base * r) / 255);
    case ChannelType.GREEN:
      return Math.round((base * g) / 255);
    case ChannelType.BLUE:
      return Math.round((base * b) / 255);
    // The white part of the pattern colour.
    case ChannelType.WHITE:
      return Math.round((base * Math.min(r, g, b)) / 255);
    // CMY filters subtract light: mask the light let through (255 - filter), then turn it back into a filter.
    case ChannelType.CYAN:
      return 255 - Math.round(((255 - base) * r) / 255);
    case ChannelType.MAGENTA:
      return 255 - Math.round(((255 - base) * g) / 255);
    case ChannelType.YELLOW:
      return 255 - Math.round(((255 - base) * b) / 255);
    // Specials: by how bright the cell is.
    default:
      return Math.round((base * Math.max(r, g, b)) / 255);
  }
};

/**
 * MASK on an RGBW head: read the base as light (W adds to R, G and B), filter it by the pattern colour, then move
 * the shared white back onto W, the same split getWhiteShare makes. So a W-only white masked by red comes out red.
 */
const maskRgbw = (values: (number | null)[], slots: RgbwSlots, rgb: readonly [number, number, number]) => {
  const w = values[slots.w] ?? 0;
  const r = Math.round((Math.min(255, (values[slots.r] ?? 0) + w) * rgb[0]) / 255);
  const g = Math.round((Math.min(255, (values[slots.g] ?? 0) + w) * rgb[1]) / 255);
  const b = Math.round((Math.min(255, (values[slots.b] ?? 0) + w) * rgb[2]) / 255);
  const white = Math.min(r, g, b);
  values[slots.r] = r - white;
  values[slots.g] = g - white;
  values[slots.b] = b - white;
  values[slots.w] = white;
};

type RgbwSlots = { r: number; g: number; b: number; w: number };

/** One grid cell a pattern writes: a fixture head's colour slots. */
type CellTarget = {
  values: (number | null)[];
  position: number;
  /** The head's slots with a colour channel type. */
  slots: { slot: number; type: ChannelType }[];
  /** Every channel type of the head, for the RGBW white share. */
  headTypes: ChannelType[];
  /** The head's red, green, blue and white slots, when it has all four. For MASK. */
  rgbwSlots: RgbwSlots | null;
};

type CompiledPattern = { track: PatternTrack; effectId: string; blendMode: BlendMode; targets: CellTarget[] };

export type PatternPlayer = {
  /** The fixtures some pattern writes to. Only these change over time. */
  values: Map<string, (number | null)[]>;
  /**
   * Updates `values` for `timeMs` (ms since the cue started): static values, then each pattern in order, then the
   * overrides. Returns false when nothing can have changed since the last call.
   */
  evaluate: (timeMs: number) => boolean;
  /** Milliseconds until the output can next change; 0 = every frame, `Infinity` = never. */
  nextChangeDelay: (timeMs: number) => number;
};

export type CompilePatternPlayerInput = {
  /** The static values from getDmxValues, without overrides. Never changed. */
  base: DmxValuesByFixtureId;
  patterns: ActivePattern[];
  fixtures: PatchedFixture[];
  fixtureTemplates: FixtureTemplate[];
  /** compileOverrides(cue.overrides, …). Applied last, so they always win. */
  overrides?: Map<string, SlotPatch[]>;
};

/**
 * Anything broken (unknown effect id, no grid, a cell whose fixture or head is gone, an effect that throws) is
 * skipped, never thrown.
 */
export const compilePatternPlayer = (input: CompilePatternPlayerInput): PatternPlayer => {
  const { base, patterns, fixtures, fixtureTemplates, overrides } = input;
  const fixtureById = new Map(fixtures.map((f) => [f.id, f]));
  const templateById = new Map(fixtureTemplates.map((t) => [t.id, t]));
  const channelsByTemplateId = new Map(fixtureTemplates.map((t) => [t.id, new Map(t.channels.map((c) => [c.id, c]))]));
  const values = new Map<string, (number | null)[]>();

  const compiled: CompiledPattern[] = [];
  for (const { selectable, grid } of patterns) {
    const effect = getPatternEffect(selectable.effect);
    if (!effect || !grid || grid.cells.length === 0) continue;

    let track: PatternTrack;
    try {
      track = createPatternTrack(effect, selectable, grid);
    } catch (error) {
      console.warn(`Pattern effect "${effect.id}" threw; skipping it`, error);
      continue;
    }

    const targets: CellTarget[] = [];
    for (const cell of grid.cells) {
      if (selectable.fixtureIds !== "all" && !selectable.fixtureIds.includes(cell.fixtureId)) continue;

      const fixture = fixtureById.get(cell.fixtureId);
      const template = fixture && templateById.get(fixture.fixtureTemplateId);
      const mode = template?.modes.find((m) => m.id === fixture!.modeId);
      if (!fixture || !template || !mode || !base[fixture.id]) continue;

      // The head's DMX slots. No heads = one head with every channel.
      const headSlots =
        mode.heads.length > 0
          ? mode.heads[cell.head]?.channelIndexes
          : cell.head === 0
            ? mode.channelIds.map((_, i) => i)
            : undefined;
      if (!headSlots) continue;

      const channelsById = channelsByTemplateId.get(template.id);
      const typeAt = (slot: number) => channelsById?.get(mode.channelIds[slot])?.type;
      const headTypes = headSlots.map(typeAt).filter((t) => t !== undefined);
      // Only colour channel types, so dimmers are never touched.
      const slots = headSlots.flatMap((slot) => {
        const type = typeAt(slot);
        return getColourChannelValue(type, BLACK, 0) === undefined ? [] : [{ slot, type: type! }];
      });

      let fixtureValues = values.get(fixture.id);
      if (!fixtureValues) {
        fixtureValues = [...base[fixture.id]];
        values.set(fixture.id, fixtureValues);
      }
      const slotOf = (type: ChannelType) => slots.find((s) => s.type === type)?.slot;
      const [r, g, b, w] = [ChannelType.RED, ChannelType.GREEN, ChannelType.BLUE, ChannelType.WHITE].map(slotOf);
      const rgbwSlots = r !== undefined && g !== undefined && b !== undefined && w !== undefined ? { r, g, b, w } : null;
      targets.push({
        values: fixtureValues,
        position: track.indexByKey.get(cellKey(cell.col, cell.row))!,
        slots,
        headTypes,
        rgbwSlots,
      });
    }
    compiled.push({ track, effectId: effect.id, blendMode: selectable.blendMode, targets });
  }

  const overridesForValues = [...values.keys()].flatMap((id) => {
    const patches = overrides?.get(id);
    return patches ? [{ values: values.get(id)!, patches }] : [];
  });

  let evaluated = false;
  const colour: [number, number, number] = [0, 0, 0];
  const failed = new Set<CompiledPattern>();

  const evaluate = (timeMs: number): boolean => {
    let changed = !evaluated;
    for (const pattern of compiled) {
      try {
        if (pattern.track.evaluate(timeMs)) changed = true;
        if (failed.delete(pattern)) changed = true;
      } catch (error) {
        console.warn(`Pattern effect "${pattern.effectId}" threw; skipping it`, error);
        if (!failed.has(pattern)) changed = true;
        failed.add(pattern);
      }
    }
    if (!changed) return false;
    evaluated = true;

    for (const [id, fixtureValues] of values) {
      const staticValues = base[id];
      for (let i = 0; i < fixtureValues.length; i++) fixtureValues[i] = staticValues[i];
    }

    for (const pattern of compiled) {
      if (failed.has(pattern)) continue;
      const { rgb } = pattern.track;
      for (const target of pattern.targets) {
        colour[0] = rgb[target.position * 3];
        colour[1] = rgb[target.position * 3 + 1];
        colour[2] = rgb[target.position * 3 + 2];
        if (pattern.blendMode === BlendMode.MASK) {
          const { rgbwSlots } = target;
          if (rgbwSlots) maskRgbw(target.values, rgbwSlots, colour);
          for (const { slot, type } of target.slots) {
            if (rgbwSlots && (slot === rgbwSlots.r || slot === rgbwSlots.g || slot === rgbwSlots.b || slot === rgbwSlots.w)) {
              continue;
            }
            target.values[slot] = maskChannel(type, target.values[slot] ?? 0, colour);
          }
          continue;
        }
        const white = getWhiteShare(colour, target.headTypes);
        for (const { slot, type } of target.slots) {
          const effectValue = getColourChannelValue(type, colour, white)!;
          target.values[slot] = blend(pattern.blendMode, target.values[slot] ?? 0, effectValue);
        }
      }
    }

    for (const { values: fixtureValues, patches } of overridesForValues) applySlotPatches(fixtureValues, patches);
    return true;
  };

  const nextChangeDelay = (timeMs: number) => {
    let delay = Infinity;
    for (const { track } of compiled) delay = Math.min(delay, track.nextChangeDelay(timeMs));
    return delay;
  };

  return { values, evaluate, nextChangeDelay };
};
