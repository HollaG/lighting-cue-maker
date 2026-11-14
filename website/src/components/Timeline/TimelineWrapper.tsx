import {
  TimelineContext,
  useItem,
  useRow,
  useTimelineContext,
  type DragEndEvent,
  type Range,
  type ResizeEndEvent,
  type Span,
  type UsePanStrategy,
  useWheelStrategy,
} from "dnd-timeline";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Box, Flex, Group, Kbd, Stack, Text } from "@mantine/core";
import {
  getSectionLengthMs,
  TimelineSectionType,
  type Timeline,
  type TimelineAudio,
  type TimelineSection,
  type UpsertTimeline,
} from "../../types-v2/timeline";
import type { AudioFileWithUrl } from "../../types-v2/audioFile";
import { Logger } from "../../utils/logger";

/** The two fixed rows. Items can't move between them. */
const TimelineRowId = {
  AUDIO: "audio",
  SECTIONS: "sections",
} as const;
type TimelineRowId = (typeof TimelineRowId)[keyof typeof TimelineRowId];

/** What each item carries, so drag/resize handlers know which row (and so which list) it belongs to. */
type ItemData = { rowId: TimelineRowId };

const SIDEBAR_WIDTH = 128;

const logger = new Logger("TimelineWrapper", "orange");

/**
 * The timeline editor: an audio row (clips) and a sections row. Times are ms everywhere; dnd-timeline works in the
 * same units as `range`, so a span is { start, end } in ms. Every value saved is rounded to whole ms.
 *
 * Moving and resizing show at once (local state, see `optimistic`) and save through `onSave`. The server still
 * checks overlaps and the rest; a rejected save shows a notification and the refetched timeline replaces the edit.
 */
export const TimelineWrapper = ({
  timeline: timelineProp,
  audioFiles,
  onSave,
}: {
  timeline: Timeline;
  audioFiles: AudioFileWithUrl[];
  onSave: (patch: UpsertTimeline) => void;
}) => {
  // we keep the update here, because if we use tanstack state (wait for GET), it lags behind, so the old state is shown as a flash
  const [optimistic, setOptimistic] = useState<{ base: Timeline; patch: UpsertTimeline } | null>(null);
  const pendingPatch = optimistic?.base === timelineProp ? optimistic.patch : undefined;
  const timeline: Timeline = pendingPatch ? { ...timelineProp, ...pendingPatch } : timelineProp;

  const save = (patch: UpsertTimeline) => {
    // Merged with an edit still pending, so two quick edits (one to audios, one to sections) both stay visible.
    setOptimistic({ base: timelineProp, patch: { ...pendingPatch, ...patch } });
    onSave(patch);
  };

  // The visible window, in ms. Wheel zooming/panning changes this.
  const [range, setRange] = useState<Range>({ start: 0, end: 60_000 });

  // we need to prevent going below start: 0
  // note to self: the callbacks from dnd are updater fns (equivalent to setState(prev => next)) and NOT setState(next)
  const setRangeClamped = (updater: (prev: Range) => Range) => {
    // const newRange = updater(range);
    setRange((prev) => {
      const newRange = updater(prev);

      // make sure the zoom is not too high (let's limit to 1 second)
      if (newRange.end - newRange.start < 1000) {
        return prev;
      }

      // make sure the zoom not too low (let's limit to 30min)
      // check for zoom out before checking for below 0.
      // if user zooms out and the start becomes 0 AND the end becomes > 30 min, if we were to do the
      // zero check first, the range would become more than 30min (+ delta pushes over 30 min)
      if (newRange.end - newRange.start > 30 * 60_000) {
        return prev;
      }

      // make sure not below 0
      if (newRange.start < 0) {
        const delta = -newRange.start;
        return { start: 0, end: newRange.end + delta };
      }

      // else, just update
      return newRange;
    });
  };

  const fileDurationMs = new Map(audioFiles.map((f) => [f.id, f.durationMs]));

  /**
   * A drag event: Dragging a clip or section to a new time.
   *
   * Only the `sectionStartTime` (section) and `startTime` (audio) changes.
   * Nothing inside the section changes: all values in the section are relative to the section's start time.
   *
   * However, note that dragging WILL re-render the inner divisions of the section.
   *
   * @param event
   * @returns
   */
  const onDragEnd = (event: DragEndEvent) => {
    logger.info("onDragEnd", { event });
    const rowId = getRowId(event.active.data.current);
    if (!rowId || event.over?.id !== rowId) return; // reject drag from audio to section / vice versa
    const span = event.active.data.current.getSpanFromDragEvent?.(event);
    if (!span) return;
    const start = Math.max(0, Math.round(span.start));
    const id = String(event.active.id);

    // update our new start time
    if (rowId === TimelineRowId.AUDIO) {
      save({ audios: timeline.audios.map((a) => (a.id === id ? { ...a, startTime: start } : a)) });
    } else {
      save({ sections: timeline.sections.map((s) => (s.id === id ? { ...s, sectionStartTime: start } : s)) });
    }
  };

  /**
   * A resize event: dragging the start or end of a clip.
   *
   * For audio (resizing the start):
   *   set the startTime and offset. StartTime indicates the clip's start position; offset shows how far from the clip's start it is.
   * For audio (resizing the end):
   *   set the duration. Duration indicates how long the clip plays. No change to start or offset.
   * For sections (resizing the start):
   *   set the sectionStartTime, and for every TimelineMarker, subtract the delta from its time. The section's start moves, but the markers stay where they are in the song.
   * For sections (resizing the end):
   *
   * For sections: always snap to the nearest bar:
   *   resize start: snap to the earliest bar
   *   resize end: snap to the latest bar
   *
   *
   * @param event
   * @returns
   */
  const onResizeEnd = (event: ResizeEndEvent) => {
    const rowId = getRowId(event.active.data.current);
    const span = event.active.data.current.getSpanFromResizeEvent?.(event);
    if (!rowId || !span) return;
    const id = String(event.active.id);

    if (rowId === TimelineRowId.AUDIO) {
      save({
        audios: timeline.audios.map((a) =>
          a.id === id ? trimClip(a, span, event.direction, fileDurationMs.get(a.audioFileId)) : a,
        ),
      });
    } else {
      save({
        sections: timeline.sections.map((s) => (s.id === id ? resizeSection(s, span, event.direction) : s)),
      });
    }
  };

  return (
    <TimelineContext
      range={range}
      onRangeChanged={setRangeClamped} // receives an updater function (prev => next), which setState accepts
      onDragEnd={onDragEnd}
      onResizeEnd={onResizeEnd}
      sidebarWidth={SIDEBAR_WIDTH} // px on the left of each row for its label
      usePanStrategy={useWheelAndMiddleDragPan}
    >
      <Group my="xs">
        <Flex flex={1} />
        <Text c="dimmed" size="sm">
          Zoom: <Kbd>CMD</Kbd>/<Kbd>CTRL</Kbd> +<Kbd>Scroll</Kbd>
        </Text>
        <Text c="dimmed" size="sm">
          Pan: <Kbd>CMD</Kbd>/<Kbd>CTRL</Kbd> + <Kbd>Shift</Kbd> + <Kbd>Scroll</Kbd> or <Kbd>Middle-click</Kbd> + drag
        </Text>
      </Group>
      <TimelineRuler />
      <TimelineRows timeline={timeline} audioFiles={audioFiles} />
    </TimelineContext>
  );
};

/**
 * Pan strategy: the library's default wheel zoom/pan, plus middle-click drag to pan.
 *
 * Passed to TimelineContext as `usePanStrategy`, which calls it like a hook on every render, so hooks inside are fine.
 * onPanEnd({ deltaX }) shifts the range by deltaX px (no clientX = no zoom), and our onRangeChanged still clamps it.
 * Items aren't affected: dnd-kit only starts an item drag on the primary (left) button.
 */
const useWheelAndMiddleDragPan: UsePanStrategy = (timelineBag, onPanEnd) => {
  useWheelStrategy(timelineBag, onPanEnd);

  // Both in refs: onPanEnd is a new function whenever the range changes (i.e. on every pan step). If the effect
  // depended on it, it would re-run mid-drag and a local `lastX` would reset to null, so the pan would stop after 1 px.
  const lastXRef = useRef<number | null>(null);
  const onPanEndRef = useRef(onPanEnd);
  onPanEndRef.current = onPanEnd;

  useLayoutEffect(() => {
    const element = timelineBag.timelineRef.current;
    if (!element) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 1) return; // 1 = middle button
      event.preventDefault(); // stops the browser's middle-click autoscroll
      lastXRef.current = event.clientX;
      element.setPointerCapture(event.pointerId); // keep receiving moves when the cursor leaves the timeline
    };
    const onPointerMove = (event: PointerEvent) => {
      if (lastXRef.current === null) return;
      const deltaX = event.clientX - lastXRef.current;
      lastXRef.current = event.clientX;
      onPanEndRef.current({ deltaX: -deltaX, deltaY: 0 }); // drag right = view moves to earlier times, like grabbing the track
    };
    const onPointerUp = (event: PointerEvent) => {
      if (lastXRef.current === null) return;
      lastXRef.current = null;
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerUp);
    element.addEventListener("pointercancel", onPointerUp);
    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerUp);
    };
  }, [timelineBag.timelineRef]);
};

/** The row id stored in an item's data (see TimelineItem). */
const getRowId = (data: object | undefined): TimelineRowId | undefined =>
  (data as Partial<ItemData> | undefined)?.rowId;

/** Must be inside TimelineContext: useTimelineContext gives the container's ref and style. */
const TimelineRows = ({ timeline, audioFiles }: { timeline: Timeline; audioFiles: AudioFileWithUrl[] }) => {
  const { setTimelineRef, style } = useTimelineContext();
  const fileName = new Map(audioFiles.map((f) => [f.id, f.fileName]));

  return (
    <Box ref={setTimelineRef} style={style}>
      <TimelineRow id={TimelineRowId.AUDIO} sidebar="Audio clips">
        {timeline.audios.map((clip) => (
          <TimelineItem
            key={clip.id}
            id={clip.id}
            rowId={TimelineRowId.AUDIO}
            span={{ start: clip.startTime, end: clip.startTime + clip.duration }}
          >
            {fileName.get(clip.audioFileId) ?? "Missing file"}
          </TimelineItem>
        ))}
      </TimelineRow>

      <TimelineRow id={TimelineRowId.SECTIONS} sidebar="Timed sections (Cue markers)">
        {timeline.sections.map((section) => (
          <TimelineItem
            key={section.id}
            id={section.id}
            rowId={TimelineRowId.SECTIONS}
            span={{ start: section.sectionStartTime, end: section.sectionStartTime + getSectionLengthMs(section) }}
          >
            {section.name || "Untitled"}
          </TimelineItem>
        ))}
      </TimelineRow>
    </Box>
  );
};

const TimelineRow = ({ id, sidebar, children }: { id: TimelineRowId; sidebar: ReactNode; children: ReactNode }) => {
  const { setNodeRef, rowWrapperStyle, rowStyle, rowSidebarStyle } = useRow({ id });

  return (
    <div
      style={{
        ...rowWrapperStyle,
        minHeight: 48,
        borderBottom: "1px solid var(--mantine-color-default-border)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          ...rowSidebarStyle,
          display: "flex",
          alignItems: "center",
          paddingInline: 8,
          background: "var(--mantine-color-body)",
          overflow: "hidden",
        }}
      >
        <Text size="xs" c="dimmed">
          {sidebar}
        </Text>
      </div>
      <div ref={setNodeRef} style={rowStyle}>
        {children}
      </div>
    </div>
  );
};

const TimelineItem = ({
  id,
  rowId,
  span,
  children,
}: {
  id: string;
  rowId: TimelineRowId;
  span: Span;
  children: ReactNode;
}) => {
  const data: ItemData = { rowId };
  const { setNodeRef, attributes, listeners, itemStyle, itemContentStyle } = useItem({ id, span, data });

  return (
    <div ref={setNodeRef} style={itemStyle} {...listeners} {...attributes}>
      <div
        style={{
          ...itemContentStyle,
          height: "100%",
          overflow: "hidden",
          borderRadius: "var(--mantine-radius-sm)",
          background: "var(--mantine-primary-color-light)",
          color: "var(--mantine-primary-color-light-color)",
          paddingInline: 6,
          display: "flex",
          alignItems: "center",
          zIndex: 99,
        }}
      >
        <Text size="xs" truncate>
          {children}
        </Text>
      </div>
    </div>
  );
};

/**
 * A clip resized = a trim (the file never changes). From the start edge the audio stays where it is in the song:
 * startTime and offset move together. Clamped to the file: offset ≥ 0, offset + duration ≤ its length.
 */
const trimClip = (
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
const resizeSection = (section: TimelineSection, span: Span, direction: "start" | "end"): TimelineSection => {
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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const TARGET_LABEL_GAP = 100;
const TimelineRuler = () => {
  const { range, pixelsToValue } = useTimelineContext();

  const minStepMs = pixelsToValue(TARGET_LABEL_GAP);
  const { stepMs, ticks } = getTicks(range, minStepMs);

  return (
    <div
      style={{
        position: "relative",
        height: 28,
        marginLeft: SIDEBAR_WIDTH,
        borderBottom: "1px solid var(--mantine-color-default-border)",
      }}
    >
      {ticks.map((t) => (
        <TimelineTick key={t} timeMs={t} />
      ))}
    </div>
  );
};
const TimelineTick = ({ timeMs }: { timeMs: number }) => {
  const { valueToPixels, range } = useTimelineContext();
  const left = valueToPixels(timeMs - range.start);

  return (
    <Box
      style={{
        position: "absolute",
        left: left,
        top: 0,
        height: "100%",
        // borderLeftWidth: "1px",
        borderWidth: "0 0 0 2px",
        borderStyle: "solid",
        borderColor: "var(--mantine-color-default-border)",
        paddingLeft: "0.2rem",
        paddingBottom: "0.2rem",
      }}
    >
      {" "}
      <Text c="dimmed" size="xs" ff="monospace">
        {msToTimeString(timeMs)}{" "}
      </Text>
    </Box>
  );
};

/** Return ms as a time string, e.g. 3:45.678 */
const msToTimeString = (ms: number) => {
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
const getTicks = (range: Range, minStepMs: number): { stepMs: number; ticks: number[] } => {
  const { start, end } = range;
  const length = end - start;

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
