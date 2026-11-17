import { Box, Menu, Title } from "@mantine/core";
import { useTimelineContext } from "dnd-timeline";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { TimelineMarker } from "../../types-v2/timeline";
import { ConfirmDelete } from "../ConfirmDeleteButton/ConfirmDeleteButton";

/** How wide the grab area is, in px. The visible line stays 4px. */
const GRAB_WIDTH = 12;

/**
 * Where a dragged marker lands: `rawMs` snapped to `snapMs` and kept inside [min, max]. If no grid point fits
 * between the neighbours, the nearest allowed whole ms is used instead.
 */
export const getDraggedMarkerTime = (rawMs: number, snapMs: number | null, min: number, max: number): number => {
  const clamp = (ms: number) => Math.min(max, Math.max(min, ms));
  if (!snapMs) return Math.round(clamp(rawMs));
  let snapped = Math.round(rawMs / snapMs) * snapMs;
  if (snapped < min) snapped = Math.ceil(min / snapMs) * snapMs;
  if (snapped > max) snapped = Math.floor(max / snapMs) * snapMs;
  return Math.round(clamp(snapped));
};

/**
 * cue marker in the timeline.
 *
 * Drag left or right by click-and-drag, but will not drag past the previous or next marker. Snaps to the grid if enabled.
 */
export const TimelineMarkerItem = ({
  marker,
  label,
  hiddenPx,
  snapMs,
  minTime,
  maxTime,
  // formatTime,
  onDraggingChange,
  onMove,
  onDelete,
}: {
  marker: TimelineMarker;
  /** e.g. "Cue 3" */
  label: string;
  /** Px of the section hidden before the viewport (see TimelineBeatSectionContent). */
  hiddenPx: number;
  /** Grid step in ms, or null when snapping is off. */
  snapMs: number | null;
  /** Earliest / latest time this marker may get, in ms from the section start. */
  minTime: number;
  maxTime: number;
  /** Readout shown while dragging, e.g. "Bar 3 · Beat 2". */
  // formatTime: (ms: number) => string;
  onDraggingChange: (dragging: boolean) => void;
  /** Called on release when the time changed. */
  onMove: (markerId: string, time: number) => void;
  /** Called when the user confirms deletion. */
  onDelete: (markerId: string) => void;
}) => {
  const { valueToPixels, pixelsToValue } = useTimelineContext();
  /** Set while dragging: where the press started, and the marker's time then. */
  const drag = useRef<{ pointerId: number; startX: number; startTime: number } | null>(null);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  const endDrag = () => {
    const current = drag.current;
    if (current && elementRef.current?.hasPointerCapture(current.pointerId)) {
      elementRef.current.releasePointerCapture(current.pointerId);
    }
    drag.current = null;
    setDragTime(null);
    onDraggingChange(false);
  };

  // Escape cancels the drag.
  const isDragging = dragTime !== null;
  useEffect(() => {
    if (!isDragging) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") endDrag();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // endDrag only uses refs and setters that are stable for the drag's lifetime
  }, [isDragging]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation(); // the section's dnd-timeline drag never sees it
    event.currentTarget.setPointerCapture(event.pointerId); // move/up come here even when off the marker
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startTime: marker.time };
    setDragTime(marker.time);
    onDraggingChange(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    // pixelsToValue is a plain scale, so it converts a px distance to a ms distance.
    const rawMs = current.startTime + pixelsToValue(event.clientX - current.startX);
    setDragTime(getDraggedMarkerTime(rawMs, snapMs, minTime, maxTime));
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const time = dragTime;
    endDrag();
    if (time !== null && time !== marker.time) onMove(marker.id, time);
  };

  const time = dragTime ?? marker.time;
  const x = valueToPixels(time) - hiddenPx;

  return (
    <Menu>
      <Menu.ContextMenu>
        <Box
          ref={elementRef}
          style={{
            position: "absolute",
            left: x - GRAB_WIDTH / 2,
            top: 0,
            width: GRAB_WIDTH,
            height: "100%",
            cursor: isDragging ? "grabbing" : "ew-resize",
            touchAction: "none", // no scrolling/zooming on touch while dragging
            zIndex: isDragging ? 2 : 1,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={endDrag}
          onClick={(event) => event.stopPropagation()} // don't open the add-cue modal
        >
          {/* The visible 4px line, centred in the grab area. */}
          <Box
            style={{
              position: "absolute",
              left: GRAB_WIDTH / 2 - 2,
              top: 0,
              width: 4,
              height: "100%",
              backgroundColor: "light-dark(var(--cue-color--light), var(--cue-color--dark))",
              opacity: isDragging ? 0.8 : 1,
            }}
          />
          <Box
            style={{
              position: "absolute",
              bottom: 0,
              left: GRAB_WIDTH / 2,
              backgroundColor: "light-dark(var(--cue-color--light), var(--cue-color--dark))",
              padding: "0.2rem",
            }}
          >
            <Title order={6} style={{ textWrap: "nowrap" }}>
              {label}
              {/* {isDragging && ` · ${formatTime(time)}`} */}
            </Title>
          </Box>
        </Box>
      </Menu.ContextMenu>
      {/* Portal events still bubble through React to the draggable item. */}
      <Menu.Dropdown onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
        <Menu.Label>Actions</Menu.Label>
        {/* <Menu.Item>Open</Menu.Item>
                 <Menu.Item>Rename</Menu.Item>
                 <Menu.Item>Duplicate</Menu.Item> */}
        {/* <Menu.Divider /> */}
        <ConfirmDelete onConfirm={() => onDelete(marker.id)}>
          <Menu.Item color="red" closeMenuOnClick={false}>
            Delete
          </Menu.Item>
        </ConfirmDelete>
      </Menu.Dropdown>
    </Menu>
  );
};
