import { useCallback, useEffect, useMemo } from "react";
import {
  applyPatternEffects,
  getActivePatterns,
  getNextPatternChangeDelay,
} from "../effects/pattern/applyPatternEffects";
import { useEffectClock } from "./useEffectClock";
import { useGetCue } from "../query-v2/cues/useGetCue";
import { useGetVisualiserData } from "../query-v2/visualiser-data/useGetVisualiserData";
import { useAppStore } from "../store/appStore";
import type { PatchedFixture } from "../types-v2/patchedFixture";
import { Logger } from "../utils/logger";
import { recordPerf } from "../utils/perfProbe"; // TEMPORARY
import { applyOverrides, getDmxValues, type DmxValuesByFixtureId } from "../utils/visualiser-v2-resolver";

const logger = new Logger("useResolvedDmx", "cyan");

/**
 * DMX values for the currently selected cue (`currentlySelectedCueId` in the active item).
 * `dmxValues` is null while there is no selected cue or the setup data is still loading.
 *
 * Each call computes its own copy. If several components need the values, call this once
 * in a shared parent and pass `dmxValues` down.
 */
export const useResolvedDmx = (
  eventId: string,
  fixtures: PatchedFixture[],
): {
  /** Static values only: no pattern effects, no overrides. */
  dmxValues: DmxValuesByFixtureId | null;
  /** Static values, then pattern effects (changes over time), then overrides. For the visualiser. */
  dmxValuesWithOverrides: DmxValuesByFixtureId | null;
  /**
   * Static values, then overrides: no pattern effects, so it only changes when the cue or setup changes.
   * For the DMX drawer, which must not re-render on every effect step.
   */
  dmxValuesForEditing: DmxValuesByFixtureId | null;
  isLoading: boolean;
} => {
  const currentlySelectedCueId = useAppStore((state) => state.currentlySelectedCueId);
  const activeItemId = useAppStore((state) => state.activeItemId);

  const { visualiserData, isVisualiserDataLoading } = useGetVisualiserData(eventId);
  const { cue, isCueLoading } = useGetCue(eventId, activeItemId, currentlySelectedCueId);

  // Derived from the cue + setup data, so no state needed. Only recomputed when one of those changes.
  const dmxValues = useMemo(() => {
    if (!cue || !visualiserData) return null;

    return getDmxValues({
      cue,
      fixtures,
      fixtureGroups: visualiserData.fixtureGroups,
      fixtureTemplates: visualiserData.fixtureTemplates,
      optionSetsByGroupId: visualiserData.optionSetsByGroupId,
    });
  }, [cue, fixtures, visualiserData]);

  // --- Pattern effects: animated on top of the static values ---
  const patterns = useMemo(
    () =>
      cue && visualiserData
        ? getActivePatterns(cue, visualiserData.fixtureGroups, visualiserData.optionSetsByGroupId)
        : [],
    [cue, visualiserData],
  );
  const getNextDelay = useCallback((t: number) => getNextPatternChangeDelay(patterns, t), [patterns]);
  // Restarts from 0 when another cue is selected or the patterns' timing changes, otherwise the timer already
  // waiting (for the old step length) runs out first. Same reason as PatternPreview's resetKey.
  const resetKey = [
    cue?.id,
    ...patterns.map(
      ({ selectable: s }) => `${s.id}|${s.effect}|${s.stepDuration}|${s.fadeInDuration}|${s.fadeOutDuration}`,
    ),
  ].join(";");
  const timeMs = useEffectClock(patterns.length > 0, resetKey, getNextDelay, "event"); // TEMPORARY perf label

  const dmxValuesWithEffects = useMemo(() => {
    if (!dmxValues || !visualiserData || patterns.length === 0) return dmxValues; // nothing animates: same object
    const startedAt = performance.now(); // TEMPORARY perf probe
    const result = applyPatternEffects({
      base: dmxValues,
      patterns,
      fixtures,
      fixtureTemplates: visualiserData.fixtureTemplates,
      timeMs,
    });
    recordPerf("applyPatternEffects", performance.now() - startedAt);
    return result;
  }, [dmxValues, visualiserData, patterns, fixtures, timeMs]);

  const overrides = cue?.overrides;

  // Static values + overrides, no effects. Depends only on the cue and setup (never on timeMs), so the DMX drawer
  // that uses it doesn't re-render on every effect step.
  // Why we need this and `dmxValues`: sometimes we want to show the original (non-overwritten) values.
  const dmxValuesForEditing = useMemo(() => {
    if (!dmxValues || !visualiserData) return dmxValues; // nothing to do: keep the same object
    return applyOverrides(dmxValues, overrides, fixtures, visualiserData.fixtureTemplates);
  }, [dmxValues, overrides, fixtures, visualiserData]);

  // For the visualiser: effects, then overrides (overrides always win).
  // When nothing animates, it is the same object as dmxValuesForEditing.
  const dmxValuesWithOverrides = useMemo(() => {
    if (patterns.length === 0) return dmxValuesForEditing;
    if (!dmxValuesWithEffects || !visualiserData) return dmxValuesWithEffects;
    return applyOverrides(dmxValuesWithEffects, overrides, fixtures, visualiserData.fixtureTemplates);
  }, [patterns, dmxValuesForEditing, dmxValuesWithEffects, overrides, fixtures, visualiserData]);

  useEffect(() => {
    logger.debug("dmx values", dmxValues);
  }, [dmxValues]);

  const isLoading = isVisualiserDataLoading || isCueLoading;
  return { dmxValues, dmxValuesWithOverrides, dmxValuesForEditing, isLoading };
};
