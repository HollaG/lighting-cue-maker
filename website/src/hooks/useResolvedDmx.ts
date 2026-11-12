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
  /** Static values, then pattern effects (changes over time), then overrides. */
  dmxValuesWithOverrides: DmxValuesByFixtureId | null;
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
  // Restarts from 0 when another cue is selected.
  const timeMs = useEffectClock(patterns.length > 0, cue?.id, getNextDelay);

  const dmxValuesWithEffects = useMemo(() => {
    if (!dmxValues || !visualiserData || patterns.length === 0) return dmxValues; // nothing animates: same object
    return applyPatternEffects({
      base: dmxValues,
      patterns,
      fixtures,
      fixtureTemplates: visualiserData.fixtureTemplates,
      timeMs,
    });
  }, [dmxValues, visualiserData, patterns, fixtures, timeMs]);

  const overrides = cue?.overrides;

  // These are the DMX values with effects and then overrides applied (overrides always win).
  // Why we need both:
  //   Sometimes, we want to show the originl (non-overwritten) values
  // Actually, most of the time, we can use this value, because if no overrides, it will return the base.
  const dmxValuesWithOverrides = useMemo(() => {
    if (!dmxValuesWithEffects || !visualiserData) return dmxValuesWithEffects; // nothing to do: keep the same object
    return applyOverrides(dmxValuesWithEffects, overrides, fixtures, visualiserData.fixtureTemplates);
  }, [dmxValuesWithEffects, overrides, fixtures, visualiserData]);

  useEffect(() => {
    logger.debug("dmx values", dmxValues);
  }, [dmxValues]);

  const isLoading = isVisualiserDataLoading || isCueLoading;
  return { dmxValues, dmxValuesWithOverrides, isLoading };
};
