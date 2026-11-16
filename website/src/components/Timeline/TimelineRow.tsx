import { useRow, useTimelineContext, type Range } from "dnd-timeline";
import { useRef, useState, type ReactNode } from "react";
import { Text } from "@mantine/core";
import { TimelineRowId } from "../../utils/timeline";
import { useLocalStorage } from "@mantine/hooks";

import classes from "./Timeline.module.css";

export const TimelineRow = ({
  id,
  sidebar,
  children,
  styles,
  onCreate,
}: {
  id: TimelineRowId;
  sidebar: ReactNode;
  children: ReactNode;
  styles?: React.CSSProperties;
  onCreate?: (range: Range) => void;
}) => {
  const { setNodeRef, rowWrapperStyle, rowStyle, rowSidebarStyle } = useRow({ id });
  const { getValueFromScreenX, valueToPixels, range } = useTimelineContext();

  const [rowHeight, setRowHeight] = useLocalStorage({
    key: `timeline-row-${id}-height`,
    defaultValue: id === TimelineRowId.SECTIONS ? 128 : 48,
    getInitialValueInEffect: false, // don't use defaultValue
  });
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const clamp = (h: number) => Math.min(400, Math.max(48, h));

  // --- Handle drag to create ---------
  // The span being drawn, in ms. startX (px) is only used to tell a click from a drag.
  const [draft, setDraft] = useState<{ startMs: number; endMs: number; startX: number } | null>(null);

  const onCreateDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // empty space only: pressing on a section makes e.target that section, not this div
    if (!onCreate || e.button !== 0 || e.target !== e.currentTarget) return;
    e.currentTarget.setPointerCapture(e.pointerId); // keep getting moves if the cursor leaves the row
    const ms = getValueFromScreenX(e.clientX);
    setDraft({ startMs: ms, endMs: ms, startX: e.clientX });
  };

  const onCreateMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draft) return;
    setDraft({ ...draft, endMs: getValueFromScreenX(e.clientX) });
  };

  const onCreateUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draft) return;
    // under 5px = a click, not a draw
    if (Math.abs(e.clientX - draft.startX) >= 5) {
      onCreate?.({
        start: Math.max(0, Math.min(draft.startMs, draft.endMs)), // drawing right-to-left works too
        end: Math.max(draft.startMs, draft.endMs),
      });
    }
    setDraft(null);
  };

  const cancelCreate = () => setDraft(null);
  return (
    <div
      style={{
        ...rowWrapperStyle,
        ...styles,
        borderBottom: "1px solid var(--mantine-color-default-border)",
        overflow: "hidden",
        height: rowHeight,
        position: "relative",
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
      <div
        ref={setNodeRef}
        style={rowStyle}
        // handlers for creating new section
        onPointerDown={onCreateDown} // only if onCreate is set, button 0, e.target === e.currentTarget
        onPointerMove={onCreateMove}
        onPointerUp={onCreateUp}
        onLostPointerCapture={cancelCreate}
      >
        {children}

        {/* Create "ghost": the span being drawn. pointerEvents none so it never becomes e.target */}
        {draft && (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: valueToPixels(Math.min(draft.startMs, draft.endMs) - range.start),
              width: valueToPixels(Math.abs(draft.endMs - draft.startMs)),
              background: "var(--mantine-color-lime-light)",
              border: "1px dashed var(--mantine-color-lime-filled)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* the resize handle */}
      <div
        className={classes.rowResizeHandle} // absolute, bottom: 0, height: 6px, cursor: ns-resize, touch-action: none
        role="separator"
        aria-orientation="horizontal"
        tabIndex={0}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation(); // keep the timeline's pan and dnd-kit out of it
          e.currentTarget.setPointerCapture(e.pointerId);
          dragRef.current = { startY: e.clientY, startHeight: rowHeight };
        }}
        onPointerMove={(e) => {
          if (!dragRef.current) return;
          setRowHeight(clamp(dragRef.current.startHeight + e.clientY - dragRef.current.startY));
        }}
        onPointerUp={(e) => {
          dragRef.current = null;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onKeyDown={(e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          e.preventDefault();
          setRowHeight((h) => clamp(h + (e.key === "ArrowDown" ? 8 : -8)));
        }}
        onLostPointerCapture={() => {
          dragRef.current = null;
        }}
      />
    </div>
  );
};
