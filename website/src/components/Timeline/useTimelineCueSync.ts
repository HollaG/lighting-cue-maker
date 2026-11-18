// A hook that tracks the timeline and activates (non-purely) cues via selectedCueId in the CueSlice

import { useEffect, useMemo } from "react";
import type { Timeline } from "../../types-v2/timeline";
import { useAppStore } from "../../store/appStore";

export const useTimelineCueSync = ({
  timeline,
  getPositionMs,
  playing,
}: {
  timeline: Timeline;
  getPositionMs: () => number;
  playing: boolean;
}) => {
  const setSelectedCueId = useAppStore((state) => state.setCurrentlySelectedCueId);

  // marker list in time
  const markers = useMemo(
    () =>
      timeline.sections
        .flatMap((section) =>
          section.markers.map((marker) => ({
            cueId: marker.cueId,
            atMs: section.sectionStartTime + marker.time,
          })),
        )
        .sort((a, b) => a.atMs - b.atMs),
    [timeline],
  );

  useEffect(() => {
    if (!playing) return;

    let prevMs = getPositionMs();

    // Conditions for firing a cue when press play:
    // 1. it must be exactly at getPositionMs
    let inclusive = true;

    let raf = requestAnimationFrame(function tick() {
      const positionMs = getPositionMs();
      if (positionMs < prevMs) {
        // jumped backwards (ruler seek while playing): new Play
        prevMs = positionMs;
        inclusive = true;
      }

      // the latest marker crossed since the last frame
      const crossed = markers.findLast((m) => (inclusive ? m.atMs >= prevMs : m.atMs > prevMs) && m.atMs <= positionMs);
      if (crossed) setSelectedCueId(crossed.cueId);

      prevMs = positionMs;
      inclusive = false;
      raf = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(raf);
  }, [markers, getPositionMs, playing, setSelectedCueId]);
};
