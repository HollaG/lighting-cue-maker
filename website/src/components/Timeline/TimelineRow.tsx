import { useRow } from "dnd-timeline";
import { useRef, type ReactNode } from "react";
import { Text } from "@mantine/core";
import { TimelineRowId } from "../../utils/timeline";
import { useLocalStorage } from "@mantine/hooks";

import classes from "./Timeline.module.css";

export const TimelineRow = ({
  id,
  sidebar,
  children,
  styles,
}: {
  id: TimelineRowId;
  sidebar: ReactNode;
  children: ReactNode;
  styles?: React.CSSProperties;
}) => {
  const { setNodeRef, rowWrapperStyle, rowStyle, rowSidebarStyle } = useRow({ id });

  const [rowHeight, setRowHeight] = useLocalStorage({
    key: `timeline-row-${id}-height`,
    defaultValue: id === TimelineRowId.SECTIONS ? 128 : 48,
    getInitialValueInEffect: false, // don't use defaultValue
  });
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const clamp = (h: number) => Math.min(400, Math.max(48, h));

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
      <div ref={setNodeRef} style={rowStyle}>
        {children}
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
