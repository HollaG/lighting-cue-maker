import { useEffect, useMemo } from "react";
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
): { dmxValues: DmxValuesByFixtureId | null; dmxValuesWithOverrides: DmxValuesByFixtureId | null } => {
  const currentlySelectedCueId = useAppStore((state) => state.currentlySelectedCueId);
  const activeItemId = useAppStore((state) => state.activeItemId);

  const { visualiserData } = useGetVisualiserData(eventId);
  const { cue } = useGetCue(eventId, activeItemId, currentlySelectedCueId);

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

  const overrides = cue?.overrides;

  // These are the DMX values with overrides applied.
  // Why we need both:
  //   Sometimes, we want to show the originl (non-overwritten) values
  // Actually, most of the time, we can use this value, because if no overrides, it will return the base.
  const dmxValuesWithOverrides = useMemo(() => {
    if (!dmxValues || !visualiserData) return dmxValues; // nothing to do: keep the same object
    return applyOverrides(dmxValues, overrides, fixtures, visualiserData.fixtureTemplates);
  }, [dmxValues, overrides, fixtures, visualiserData]);

  useEffect(() => {
    logger.debug("dmx values", dmxValues);
  }, [dmxValues]);

  return { dmxValues, dmxValuesWithOverrides };
};
