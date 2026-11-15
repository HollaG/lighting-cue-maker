import { useItem, useRow, type Span } from "dnd-timeline";
import type { ReactNode } from "react";
import { Text } from "@mantine/core";
import type { ItemData, TimelineRowId } from "../../utils/timeline";

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

  return (
    <div
      style={{
        ...rowWrapperStyle,
        minHeight: 48,
        borderBottom: "1px solid var(--mantine-color-default-border)",
        overflow: "hidden",
        ...styles,
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

export const TimelineItem = ({
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
