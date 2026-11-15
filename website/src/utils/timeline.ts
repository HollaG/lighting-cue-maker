import type { Range, Span } from "dnd-timeline";
import {
  getSectionLengthMs,
  TimelineSectionType,
  type TimelineAudio,
  type TimelineSection,
} from "../types-v2/timeline";

/** The two fixed rows. Items can't move between them. */
export const TimelineRowId = {
  AUDIO: "audio",
  SECTIONS: "sections",
} as const;
export type TimelineRowId = (typeof TimelineRowId)[keyof typeof TimelineRowId];

/** What each item carries, so drag/resize handlers know which row (and so which list) it belongs to. */
export type ItemData = { rowId: TimelineRowId };

export const SIDEBAR_WIDTH = 128;

/** The row id stored in an item's data (see TimelineItem). */
export const getRowId = (data: object | undefined): TimelineRowId | undefined =>
  (data as Partial<ItemData> | undefined)?.rowId;

/**
 * A clip resized = a trim (the file never changes). From the start edge the audio stays where it is in the song:
 * startTime and offset move together. Clamped to the file: offset ≥ 0, offset + duration ≤ its length.
 */
export const trimClip = (
  clip: TimelineAudio,
  span: Span,
  direction: "start" | "end",
  fileDurationMs = clip.offset + clip.duration,
): TimelineAudio => {
  if (direction === "end") {
    const duration = Math.round(span.end - clip.startTime);
    return { ...clip, duration: clamp(duration, 1, fileDurationMs - clip.offset) };
  }
  const end = clip.startTime + clip.duration;
  // How far the start moved (+ = trimmed in): offset stays ≥ 0, the clip keeps ≥ 1 ms, and it can't start before 0.
  const delta = clamp(
    Math.round(span.start - clip.startTime),
    Math.max(-clip.offset, -clip.startTime),
    clip.duration - 1,
  );
  return {
    ...clip,
    startTime: clip.startTime + delta,
    offset: clip.offset + delta,
    duration: end - (clip.startTime + delta),
  };
};

/**
 * A section resized. Markers always keep their place in the song, and the section never shrinks past them.
 *
 * - End edge: only the length changes; never shorter than the last marker.
 * - Start edge: only the start moves, the end stays exactly where it was. The markers' section-relative times shift
 *   by the same amount, and the start can't pass the first marker.
 * - Beat sections move either edge in whole bars (a multiple of timeSigNum beats), so the bar grid keeps lining up
 *   with the markers. Time sections move to the ms.
 */
export const resizeSection = (section: TimelineSection, span: Span, direction: "start" | "end"): TimelineSection => {
  const times = section.markers.map((m) => m.time);
  const firstMarker = times.length > 0 ? Math.min(...times) : Infinity;
  const lastMarker = times.length > 0 ? Math.max(...times) : 0;
  const oldLength = getSectionLengthMs(section);

  /** Moves the start by delta ms (+ = later), keeping the end and the markers' song positions. */
  const moveStart = (delta: number, length: Partial<TimelineSection>): TimelineSection =>
    ({
      ...section,
      ...length,
      sectionStartTime: section.sectionStartTime + delta,
      markers: delta === 0 ? section.markers : section.markers.map((m) => ({ ...m, time: m.time - delta })),
    }) as TimelineSection;

  if (section.type === TimelineSectionType.BEAT) {
    const beatsPerBar = section.timeSigNum;
    const barMs = (beatsPerBar * 60000) / section.bpm;

    if (direction === "end") {
      const bars = Math.max(
        Math.round((span.end - section.sectionStartTime) / barMs),
        Math.ceil(lastMarker / barMs), // keeps the last marker inside
        1,
      );
      return { ...section, beats: bars * beatsPerBar };
    }

    // Whole bars trimmed from the front (negative = extended). delta is worked out from the two rounded lengths,
    // so start + length lands on the old end exactly (a section touching it must not overlap by 1 ms).
    const deltaFor = (bars: number) =>
      oldLength - Math.round(((section.beats - bars * beatsPerBar) * 60000) / section.bpm);
    let bars = Math.min(
      Math.round((span.start - section.sectionStartTime) / barMs),
      Math.floor((section.beats - 1) / beatsPerBar), // keeps at least 1 beat
    );
    while (bars > 0 && deltaFor(bars) > firstMarker) bars--; // can't pass the first marker
    while (bars < 0 && section.sectionStartTime + deltaFor(bars) < 0) bars++; // can't start before 0
    return moveStart(deltaFor(bars), { beats: section.beats - bars * beatsPerBar });
  }

  if (direction === "end") {
    const length = Math.round(span.end - section.sectionStartTime);
    return { ...section, totalTimeMs: Math.max(length, lastMarker, 1) };
  }
  const delta = clamp(
    Math.round(span.start - section.sectionStartTime),
    -section.sectionStartTime, // can't start before 0
    Math.min(firstMarker, oldLength - 1), // can't pass the first marker; keeps ≥ 1 ms
  );
  return moveStart(delta, { totalTimeMs: oldLength - delta });
};

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Return ms as a time string, e.g. 3:45.678 */
export const msToTimeString = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;

  let output = `${seconds.toString().padStart(2, "0")}`;
  if (milliseconds > 0) {
    output += `.${milliseconds.toString().padStart(3, "0")}`;
  }

  if (minutes > 0) {
    output = `${minutes}:${output}`;
  }

  return output;
};

const NICE_STEPS_MS = [
  100,
  250,
  500, // sub-second (very zoomed in)
  1_000,
  2_000,
  5_000,
  10_000,
  15_000,
  30_000, // seconds
  60_000,
  2 * 60_000,
  5 * 60_000,
  10 * 60_000, // minutes (zoomed out)
];

/**
 * Calculate the interval of ticks to display.
 *
 * Use this in the tick component to display the time:
 *
 * With this function,
 * Given the:
 *   1. width of the timeline in px
 * You can:
 *   1. Calculate the px between one time unit and the next time unit
 *   2. Calculate the px gap between each tick (given by tickTime)
 *   3. Render all the ticks.
 *
 * Couple of note:
 *   1. ticks will always be equivalently spaced apart
 *   2. the first tick may not be at the start of the range.
 *
 *
 * @param range
 * @param minStepMs
 */
export const getTicks = (range: Range, minStepMs: number): { stepMs: number; ticks: number[] } => {
  const { start, end } = range;

  // find the closest step that is greater than or equal to minStepMs
  const stepMs = NICE_STEPS_MS.find((step) => step >= minStepMs) ?? NICE_STEPS_MS[NICE_STEPS_MS.length - 1];

  // where should the first step be? it should also be a multiple of stepMs
  const first = Math.ceil(start / stepMs) * stepMs;

  // calculate the ticks
  const ticks: number[] = [];
  for (let i = 0; first + i * stepMs < end; i++) {
    ticks.push(first + i * stepMs); // computed from the index, so no floating-point drift
  }

  return { stepMs, ticks };
};
