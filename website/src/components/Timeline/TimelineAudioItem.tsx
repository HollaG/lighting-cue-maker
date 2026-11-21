import { Menu, Text, Box } from "@mantine/core";
import { type Span, useItem } from "dnd-timeline";
import type { ReactNode } from "react";
import type { ItemData, TimelineRowId } from "../../utils/timeline";
import { ConfirmDelete } from "../ConfirmDeleteButton/ConfirmDeleteButton";

export const TimelineAudioItem = ({
  id,
  rowId,
  span,
  children,
  waveform,
  onDelete,
  disabled = false,
}: {
  id: string;
  rowId: TimelineRowId;
  span: Span;
  children: ReactNode;
  /** Drawn behind the label (TimelineWaveform). Positioned from the clip's start, so it ignores the padding. */
  waveform?: ReactNode;
  disabled?: boolean;

  onDelete: (id: string) => void;
}) => {
  const data: ItemData = { rowId };
  const { setNodeRef, attributes, listeners, itemStyle, itemContentStyle } = useItem({ id, span, data, disabled });

  return (
    <div
      ref={setNodeRef}
      style={itemStyle}
      {...listeners}
      {...attributes}
      onPointerDown={(event) => {
        if (event.button === 0) listeners?.onPointerDown?.(event);
      }}
    >
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
          // No zIndex: with position: relative it would apply (it was a no-op before) and paint the clip over the
          // row's resize handle at the bottom edge.
          position: "relative", // for the waveform's absolute position
        }}
      >
        {waveform}
        <Menu shadow="md" position="top" withArrow withinPortal>
          <Menu.ContextMenu>
            <Box w="100%" style={{ overflow: "hidden", position: "relative" }} h="100%">
              <Text size="xs" truncate>
                {children}
              </Text>
            </Box>
          </Menu.ContextMenu>

          {/* Portal events still bubble through React to the draggable item. */}
          <Menu.Dropdown onPointerDown={(event) => event.stopPropagation()}>
            <Menu.Label>Actions</Menu.Label>
            {/* <Menu.Item>Open</Menu.Item>
            <Menu.Item>Rename</Menu.Item>
            <Menu.Item>Duplicate</Menu.Item> */}
            {/* <Menu.Divider /> */}
            <ConfirmDelete onConfirm={() => onDelete(id)}>
              <Menu.Item color="red" closeMenuOnClick={false}>
                Delete
              </Menu.Item>
            </ConfirmDelete>
          </Menu.Dropdown>
        </Menu>
      </div>
    </div>
  );
};
