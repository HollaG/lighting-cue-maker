import { TimelineContext, type DragEndEvent, type Range, type ResizeEndEvent, type UsePanStrategy } from "dnd-timeline";
import { useCallback, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Box, Flex, Group, Kbd, SegmentedControl, Text } from "@mantine/core";
import type { Timeline, UpsertTimeline } from "../../types-v2/timeline";
import type { AudioFileWithUrl } from "../../types-v2/audioFile";
import { Logger } from "../../utils/logger";
import { TimelineRows } from "./TimelineRows";
import { TimelineRuler } from "./TimelineRuler";
import {
  createSectionFromSpan,
  getRowId,
  resizeSection,
  SIDEBAR_WIDTH,
  TimelineRowId,
  trimClip,
} from "../../utils/timeline";
import { TimelinePlayhead } from "./TimelinePlayhead";
import { useHotkey } from "@tanstack/react-hotkeys";

const logger = new Logger("TimelineWrapper", "orange");

type Transport = {
  playing: boolean;
  /** seconds */
  anchorCtxTime: number;
  /** milliseconds */
  anchorMs: number;
};

/**
 * The timeline editor: an audio row (clips) and a sections row. Times are ms everywhere; dnd-timeline works in the
 * same units as `range`, so a span is { start, end } in ms. Every value saved is rounded to whole ms.
 *
 * Moving and resizing show at once (local state, see `optimistic`) and save through `onSave`. The server still
 * checks overlaps and the rest; a rejected save shows a notification and the refetched timeline replaces the edit.
 */
export const TimelineWrapper = ({
  eventId,
  itemId,
  timeline: timelineProp,
  audioFiles,
  onSave,
  range,
  onRangeChange,
}: {
  eventId: string;
  itemId: string;
  timeline: Timeline;
  audioFiles: AudioFileWithUrl[];
  onSave: (patch: UpsertTimeline) => void;

  range: Range;
  onRangeChange: Dispatch<SetStateAction<Range>>;
}) => {
  // zoom modifier label: Shift on every OS (see the wheel handler in useWheelAndMiddleDragPan)
  const modKey = "Shift";

  // we keep the update here, because if we use tanstack state (wait for GET), it lags behind, so the old state is shown as a flash
  const [optimistic, setOptimistic] = useState<{ base: Timeline; patch: UpsertTimeline } | null>(null);
  const pendingPatch = optimistic?.base === timelineProp ? optimistic.patch : undefined;
  const timeline: Timeline = pendingPatch ? { ...timelineProp, ...pendingPatch } : timelineProp;

  // "selected" clips
  // (values not read yet: selection is WIP)
  const [, setCurrentlySelectedAudios] = useState<Set<string>>(new Set());
  const [, setCurrentlySelectedSections] = useState<Set<string>>(new Set());

  const onSelect = (type: TimelineRowId, ids: Set<string>) => {
    if (type === TimelineRowId.AUDIO) {
      setCurrentlySelectedAudios(ids);
    } else if (type === TimelineRowId.SECTIONS) {
      setCurrentlySelectedSections(ids);
    }
  };

  // when the spacebar is pressed, toggle play/pause.
  useHotkey("Space", () => {
    if (playState === "play") {
      onPlayStateChange("pause");
    } else {
      onPlayStateChange("play");
    }
  });

  const save = (patch: UpsertTimeline) => {
    // Merged with an edit still pending, so two quick edits (one to audios, one to sections) both stay visible.
    setOptimistic({ base: timelineProp, patch: { ...pendingPatch, ...patch } });
    onSave(patch);
  };

  // we need to prevent going below start: 0
  // note to self: the callbacks from dnd are updater fns (equivalent to setState(prev => next)) and NOT setState(next)
  const setRangeClamped = (updater: (prev: Range) => Range) => {
    // const newRange = updater(range);
    onRangeChange((prev) => {
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
      // For now, we always snap to second increments.
      // TODO: we will make this more granular: such as allowing users to change the controls.
      const snappedStart = Math.round(start / 1000) * 1000;
      save({ audios: timeline.audios.map((a) => (a.id === id ? { ...a, startTime: snappedStart } : a)) });
    } else {
      // for now, sections also snap the same as audio clips.
      // the more complicated logic comes from INSIDE a section.
      const snappedStart = Math.round(start / 1000) * 1000;

      save({ sections: timeline.sections.map((s) => (s.id === id ? { ...s, sectionStartTime: snappedStart } : s)) });
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

  // WebAudio: handle the playback position
  const [playState, setPlayState] = useState<"play" | "pause" | "stop">("pause");
  const [isPlayLoading, setIsPlayLoading] = useState(false); // for showing a spinner on the play button
  const sourcesRef = useRef<
    {
      src: AudioBufferSourceNode;
      delay: number; // delay from now until when it should play
      offset: number; // where in the file it started playing, in seconds
      duration: number; // how long the source is playing, in seconds
    }[]
  >([]); // for stopping all sources on stop

  const onPlayStateChange = (newState: "play" | "pause" | "stop") => {
    if (newState === "play") {
      stopAllSources();
      onPlay();
      if (audioCtx.current) audioCtx.current.resume();
    } else if (newState === "pause") {
      // update the new playhead position
      startPlayheadPositionRef.current = getPositionMs();
      transportRef.current.playing = false;
      stopAllSources();
    } else if (newState === "stop") {
      stopAllSources();
      if (audioCtx.current) audioCtx.current.suspend();
      startPlayheadPositionRef.current = 0;
      transportRef.current.playing = false;
    }
    setPlayState(newState);
  };

  const stopAllSources = () => {
    for (const src of sourcesRef.current) {
      try {
        src.src.stop();
      } catch (e) {
        logger.warn("Failed to stop source", { e });
      }
    }
    sourcesRef.current = [];
  };

  const audioCtx = useRef<AudioContext | null>(null);
  const startPlayheadPositionRef = useRef(0); // ms
  useLayoutEffect(() => {
    if (!audioCtx.current) audioCtx.current = new AudioContext();
  }, []);

  /** Clicking on the ruler will move the playhead */
  const onRulerClick = (timeMs: number) => {
    // TODO: for now, round to 1000ms
    const rounded = Math.round(timeMs / 1000) * 1000;

    // if playing, stop playing, then resume
    if (playState === "play") {
      onPlayStateChange("pause");
      startPlayheadPositionRef.current = rounded;
      onPlayStateChange("play");
    } else {
      startPlayheadPositionRef.current = rounded;
    }
    startPlayheadPositionRef.current = rounded;
  };

  // buffer cache so we dn't refetch every audio clip everytime
  const bufferCache = useRef<
    Map<
      string,
      {
        buffer: AudioBuffer;
      }
    >
  >(new Map());

  /** on play button clicked */
  const onPlay = async () => {
    try {
      if (!audioCtx.current) return;

      setIsPlayLoading(true);

      // NOTE: even if there are no audio clips, we still need to play~
      // setup the clip timings
      for (const clip of timeline.audios) {
        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd < startPlayheadPositionRef.current) continue; // skip clips that are over

        const file = audioFiles.find((f) => f.id === clip.audioFileId);
        if (!file) continue; // some error

        // get an offset for the clip, if we're some distance into the clip
        const skipAmount = Math.max(0, startPlayheadPositionRef.current - clip.startTime);

        // fetch the file, try from cache
        let buffer: AudioBuffer;

        const existingBuf = bufferCache.current.get(file.id);
        if (existingBuf) {
          // 1 hour
          buffer = existingBuf.buffer;
        } else {
          const res = await fetch(file.url);
          const bytes = await res.arrayBuffer();
          buffer = await audioCtx.current.decodeAudioData(bytes);
          bufferCache.current.set(file.id, { buffer });
        }

        // create audio source
        const src = audioCtx.current.createBufferSource();

        src.buffer = buffer;

        src.connect(audioCtx.current.destination);

        sourcesRef.current.push({
          src,
          delay: Math.max(0, clip.startTime - startPlayheadPositionRef.current) / 1000, // when (s)
          offset: (clip.offset + skipAmount) / 1000, // where in the file (s)
          duration: (clip.duration - skipAmount) / 1000,
        });
      }
      const t0 = audioCtx.current.currentTime;
      transportRef.current = { playing: true, anchorCtxTime: t0, anchorMs: startPlayheadPositionRef.current };

      for (const src of sourcesRef.current) {
        src.src.start(src.delay + t0, src.offset, src.duration);
      }
    } catch (e) {
      logger.error("Failed to play audio", { e });
    } finally {
      setIsPlayLoading(false);
    }
  };

  // handle playhead movement
  const transportRef = useRef<Transport>({ playing: false, anchorMs: 0, anchorCtxTime: 0 });
  const getPositionMs = useCallback(() => {
    const t = transportRef.current;
    const ctx = audioCtx.current;
    if (!t.playing || !ctx) return startPlayheadPositionRef.current; // paused: the saved position
    return t.anchorMs + (ctx.currentTime - t.anchorCtxTime) * 1000;
  }, []);

  const onDelete = (type: TimelineRowId, id: string) => {
    if (type === TimelineRowId.SECTIONS) {
      // onDeleteSection(id);
      const newSections = timeline.sections.filter((s) => s.id !== id);
      save({ sections: newSections });
    } else if (type === TimelineRowId.AUDIO) {
      logger.info("Deleting audio clip", { id });
      const newAudios = timeline.audios.filter((a) => a.id !== id);
      void save({ audios: newAudios });
    }
  };

  /** Handle the onCreate from dragging on the Timeline (Section row only) */
  const onCreate = (range: Range) => {
    const { start, end } = range;

    // the start has to be snapped to the nearest second (for now)
    const snappedStart = Math.round(start / 1000) * 1000;

    // intentionally fail if we overlap
    const section = createSectionFromSpan({ start: snappedStart, end });

    // try to create
    save({ sections: [...timeline.sections, section] });
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
      {/* Transport controls */}
      <Box
        style={{
          display: "grid",
          gridTemplateColumns: `1fr auto 1fr`,
        }}
        my="sm"
      >
        <div />
        <SegmentedControl
          disabled={isPlayLoading}
          data={["play", "pause", "stop"]}
          onChange={onPlayStateChange}
          value={playState}
        />
        <Group>
          <Flex flex={1} />
          <Text c="dimmed" size="sm">
            Zoom: <Kbd>{modKey}</Kbd> + <Kbd>Scroll</Kbd>
          </Text>
          <Text c="dimmed" size="sm">
            Pan: <Kbd>Middle-click</Kbd> + drag
          </Text>
        </Group>
      </Box>

      {/* Scrolls vertically when the rows are taller than the drawer */}
      <Box style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
        {/* Use a relative wrapper to allow for absolute posiitoning of child elements (mainly the playhead) */}
        <Box style={{ position: "relative" }}>
          <TimelineRuler onClickPos={onRulerClick} />
          <TimelinePlayhead getPositionMs={getPositionMs} />
          <TimelineRows
            eventId={eventId}
            itemId={itemId}
            timeline={timeline}
            audioFiles={audioFiles}
            onSelect={onSelect}
            onDelete={onDelete}
            onCreate={onCreate}
          />
        </Box>
      </Box>
    </TimelineContext>
  );
};

/**
 * Pan strategy: Shift + wheel to zoom, plus middle-click drag to pan.
 *
 * Passed to TimelineContext as `usePanStrategy`, which calls it like a hook on every render, so hooks inside are fine.
 * onPanEnd({ deltaX }) shifts the range by deltaX px (no clientX = no zoom), and our onRangeChanged still clamps it.
 * Items aren't affected: dnd-kit only starts an item drag on the primary (left) button.
 */
const useWheelAndMiddleDragPan: UsePanStrategy = (timelineBag, onPanEnd) => {
  // Both in refs: onPanEnd is a new function whenever the range changes (i.e. on every pan step). If the effect
  // depended on it, it would re-run mid-drag and a local `lastX` would reset to null, so the pan would stop after 1 px.
  const lastXRef = useRef<number | null>(null);
  const onPanEndRef = useRef(onPanEnd);
  onPanEndRef.current = onPanEnd;

  // Shift + wheel = zoom around the cursor. Replaces the library's useWheelStrategy, which only zooms on Ctrl/Meta.
  // Browsers turn a Shift + vertical wheel into a horizontal scroll (deltaY 0, deltaX set), so read either axis.
  // In onPanEnd, deltaY + clientX means "zoom around clientX"; positive = zoom out.
  useLayoutEffect(() => {
    const element = timelineBag.timelineRef.current;
    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.shiftKey) return;
      event.preventDefault(); // stop the page/drawer scrolling sideways
      onPanEndRef.current({
        clientX: event.clientX,
        clientY: event.clientY,
        deltaX: 0,
        deltaY: event.deltaY || event.deltaX,
      });
    };

    element.addEventListener("wheel", onWheel, { passive: false }); // passive: false so preventDefault works
    return () => element.removeEventListener("wheel", onWheel);
  }, [timelineBag.timelineRef]);

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
