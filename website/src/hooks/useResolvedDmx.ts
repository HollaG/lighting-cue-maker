import { useEffect, useMemo, useState } from "react";
import { getActivePatterns } from "../effects/pattern/applyPatternEffects";
import { compilePatternPlayer } from "../effects/pattern/patternPlayer";
import { useGetCue } from "../query-v2/cues/useGetCue";
import { useGetVisualiserData } from "../query-v2/visualiser-data/useGetVisualiserData";
import { useAppStore } from "../store/appStore";
import type { PatchedFixture } from "../types-v2/patchedFixture";
import type { PatternEffectPlayback } from "../components/Visualiser3D-v2/PatternEffectRunner";
import type { CueFade } from "../components/Visualiser3D-v2/CueFadeRunner";
import type { Cue } from "../types-v2/cue";
import { Logger } from "../utils/logger";
import {
  applyOverrides,
  compileOverrides,
  getDmxValues,
  type DmxValuesByFixtureId,
} from "../utils/visualiser-v2-resolver";

const logger = new Logger("useResolvedDmx", "cyan");

/**
 * DMX values for the currently selected cue (`currentlySelectedCueId` in the active item).
 * Values are null while there is no selected cue or the setup data is still loading.
 *
 * Nothing here changes over time: pattern effects come back compiled (`effectPlayback`) and are played inside the
 * visualiser's canvas, so the page re-renders only when the cue or setup changes.
 *
 * Each call computes its own copy. If several components need the values, call this once
 * in a shared parent and pass them down.
 */
export const useResolvedDmx = (
  eventId: string,
  fixtures: PatchedFixture[],
): {
  /** Static values only: no pattern effects, no overrides. */
  dmxValues: DmxValuesByFixtureId | null;
  /** Static values, then overrides. For the DMX drawer, and the visualiser's fixtures that no effect animates. */
  dmxValuesWithOverrides: DmxValuesByFixtureId | null;
  /** The cue's pattern effects (on top of the static values, under the overrides). Null when nothing animates. */
  effectPlayback: PatternEffectPlayback | null;
  /** The last change of cue, for the visualiser to fade over. Null until the cue first changes. */
  cueFade: CueFade | null;
  isLoading: boolean;
} => {
  const currentlySelectedCueId = useAppStore((state) => state.currentlySelectedCueId);
  const activeItemId = useAppStore((state) => state.activeItemId);

  const { visualiserData, isVisualiserDataLoading } = useGetVisualiserData(eventId);
  const { cue, isCueLoading } = useGetCue(eventId, activeItemId, currentlySelectedCueId);

  // --- Cue fades: a new CueFade each time a different cue arrives ---
  // The time comes from the OUTGOING cue: a cue's transition time is how long it takes to go from it to the next cue,
  // whichever cue that is. Edits and refetches of the same cue only update the stored cue (its latest transition
  // time), so they never fade. No cue (none selected, or another item loading) = nothing to fade from.
  const [fadeState, setFadeState] = useState<{ cue: Cue | null; cueFade: CueFade | null }>({ cue, cueFade: null });
  if (cue !== fadeState.cue) {
    const outgoing = fadeState.cue;
    const isNewCue = !!cue && !!outgoing && cue.id !== outgoing.id;
    setFadeState({
      cue,
      cueFade: isNewCue
        ? { durationMs: Math.max(outgoing.transition.transitionTimeMs ?? 0, 0), startedAt: performance.now() }
        : fadeState.cueFade,
    });
  }
  const { cueFade } = fadeState;

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

  // Why we need this and `dmxValues`: sometimes we want to show the original (non-overwritten) values.
  const dmxValuesWithOverrides = useMemo(() => {
    if (!dmxValues || !visualiserData) return dmxValues; // nothing to do: keep the same object
    return applyOverrides(dmxValues, overrides, fixtures, visualiserData.fixtureTemplates);
  }, [dmxValues, overrides, fixtures, visualiserData]);

  // --- Pattern effects: compiled once here, played every frame in the canvas ---
  const patterns = useMemo(
    () =>
      cue && visualiserData
        ? getActivePatterns(cue, visualiserData.fixtureGroups, visualiserData.optionSetsByGroupId)
        : [],
    [cue, visualiserData],
  );

  // Effects restart from 0 when another cue is selected or the patterns' timing changes; a refetch of the same cue
  // keeps them running. Same reason as PatternPreview's restart key.
  const resetKey = [
    cue?.id,
    ...patterns.map(
      ({ selectable: s }) => `${s.id}|${s.effect}|${s.stepDuration}|${s.fadeInDuration}|${s.fadeOutDuration}`,
    ),
  ].join(";");
  const [clock, setClock] = useState(() => ({ resetKey, startedAt: performance.now() }));
  if (clock.resetKey !== resetKey) setClock({ resetKey, startedAt: performance.now() });

  const effectPlayback = useMemo((): PatternEffectPlayback | null => {
    if (!dmxValues || !visualiserData || patterns.length === 0) return null;
    const player = compilePatternPlayer({
      base: dmxValues,
      patterns,
      fixtures,
      fixtureTemplates: visualiserData.fixtureTemplates,
      overrides: compileOverrides(overrides, fixtures, visualiserData.fixtureTemplates),
    });
    if (player.values.size === 0) return null; // the patterns write to nothing
    return { player, startedAt: clock.startedAt };
  }, [dmxValues, visualiserData, patterns, fixtures, overrides, clock.startedAt]);

  useEffect(() => {
    logger.debug("dmx values", dmxValues);
  }, [dmxValues]);

  const isLoading = isVisualiserDataLoading || isCueLoading;
  return { dmxValues, dmxValuesWithOverrides, effectPlayback, cueFade, isLoading };
};
