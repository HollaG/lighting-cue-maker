// The pattern effect engine: turns the effects' cell colours into DMX values on top of the static values.
// Effect files only say "cell (col,row) is this colour at step N"; everything DMX lives in patternPlayer.ts.
// These are one-off wrappers around it; anything that animates should compile a player once and evaluate it per frame.

import type { Cue } from "../../types-v2/cue";
import type { FixtureGroup, Grid } from "../../types-v2/fixtureGroups";
import type { FixtureTemplate } from "../../types-v2/fixtureTemplates";
import { SelectableType, type OptionSet, type PatternSelectable } from "../../types-v2/optionSet";
import type { PatchedFixture } from "../../types-v2/patchedFixture";
import { getActiveSelectables, type DmxValuesByFixtureId } from "../../utils/visualiser-v2-resolver";
import type { PatternEffectDefinition, Rgb } from "./patternEffect";
import {
  cellKey,
  compilePatternPlayer,
  createPatternTrack,
  getSelectableChangeDelay,
  type ActivePattern,
} from "./patternPlayer";

export { cellKey, type ActivePattern } from "./patternPlayer";

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
 * Milliseconds until the pattern output can next change. 0 = every frame (a fade is running), `Infinity` = never.
 */
export const getNextPatternChangeDelay = (patterns: ActivePattern[], timeMs: number): number => {
  let delay = Infinity;
  for (const { selectable } of patterns) delay = Math.min(delay, getSelectableChangeDelay(selectable, timeMs));
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
  const { base, patterns, timeMs } = input;
  if (patterns.length === 0) return base; // nothing to do: keep the same object

  const player = compilePatternPlayer(input);
  player.evaluate(timeMs);
  const result: DmxValuesByFixtureId = { ...base };
  for (const [id, values] of player.values) result[id] = [...values];
  return result;
};

/**
 * Every grid position's colour at `timeMs`, including the fade between the previous step and this one.
 * Off cells are black. Keyed by `cellKey(col, row)`. May throw if the effect throws.
 */
export const getCellColours = (
  effect: PatternEffectDefinition,
  selectable: PatternSelectable,
  grid: Grid,
  timeMs: number,
): Map<string, Rgb> => {
  const track = createPatternTrack(effect, selectable, grid);
  track.evaluate(timeMs);
  return new Map(
    track.positions.map(({ col, row }, i): [string, Rgb] => [
      cellKey(col, row),
      [track.rgb[i * 3], track.rgb[i * 3 + 1], track.rgb[i * 3 + 2]],
    ]),
  );
};
