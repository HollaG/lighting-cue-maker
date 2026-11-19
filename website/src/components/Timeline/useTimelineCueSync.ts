// A hook that tracks the timeline and activates (non-purely) cues via selectedCueId in the CueSlice

import { useEffect, useMemo, useRef } from "react";
import { getSectionLengthMs, type Timeline } from "../../types-v2/timeline";
import { useAppStore } from "../../store/appStore";

export const useTimelineCueSync = ({
  timeline,
  getPositionMs,
  playing,

  onSectionEnd,
}: {
  timeline: Timeline;
  getPositionMs: () => number;
  playing: boolean;

  /** called when playback crosses the end of a section with linkToNext off */
  onSectionEnd: (endMs: number) => void;
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

  // Where should we stop the playhead (for non link sections)
  const stopPoints = useMemo(
    () =>
      timeline.sections
        .filter((s) => !s.linkToNext)
        .map((s) => s.sectionStartTime + getSectionLengthMs(s))
        .sort((a, b) => a - b),
    [timeline],
  );

  // AI put this here, don't really understand, but to my knowledge
  // it just seems to be a way to not re-run use effect cos the deps change
  const onSectionEndRef = useRef(onSectionEnd);
  onSectionEndRef.current = onSectionEnd;

  // Register a loop for firing cues
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

      // EXTRA: if we have just hit the end of a section and the section is set to not Link, then we pause
      const stopAt = stopPoints.find((s) => s > prevMs && s <= positionMs); // just crossed

      if (stopAt !== undefined) {
        onSectionEndRef.current(stopAt);
        return; // don't schedule another frame; `playing` becomes false and the effect cleans up
      }

      prevMs = positionMs;
      inclusive = false;

      raf = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(raf);
  }, [markers, getPositionMs, playing, setSelectedCueId]);
};
