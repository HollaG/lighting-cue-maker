import { Menu, Text, Box, Flex, SegmentedControl, NumberInput, Select, Group, Divider } from "@mantine/core";
import { type Span, useItem } from "dnd-timeline";
import type { ReactNode } from "react";
import type { ItemData, TimelineRowId } from "../../utils/timeline";
import { ConfirmDelete } from "../ConfirmDeleteButton/ConfirmDeleteButton";
import { TimelineSectionType, type TimelineSection } from "../../types-v2/timeline";
import { CustomTextInput } from "../CustomTextInput/CustomTextInput";
import { useUpsertTimelineSectionItem } from "../../query-v2/timeline/useUpsertTimelineSectionItem";

const COMMON_TIME_SIGNATURES = [
  { label: "4/4", value: "4/4" },
  { label: "3/4", value: "3/4" },
  { label: "6/8", value: "6/8" },
  { label: "5/4", value: "5/4" },
  { label: "7/8", value: "7/8" },
  { label: "9/8", value: "9/8" },
  { label: "12/8", value: "12/8" },
];

const SNAP_DIVISIONS = [
  { label: "Beat", value: "1/1" },
  { label: "1/2", value: "1/2" },
  { label: "1/3", value: "1/3" },
  { label: "1/4", value: "1/4" },
  { label: "1/6", value: "1/6" },
  { label: "1/8", value: "1/8" },
];

export const TimelineSectionItem = ({
  eventId,
  itemId,
  id,
  rowId,
  span,
  section,
  onDelete,
}: {
  eventId: string;
  itemId: string;
  id: string;
  rowId: TimelineRowId;
  span: Span;
  section: TimelineSection;
  onDelete: (id: string) => void;
}) => {
  const data: ItemData = { rowId };
  const { setNodeRef, attributes, listeners, itemStyle, itemContentStyle } = useItem({ id, span, data });

  const {} = useUpsertTimelineSectionItem(eventId, itemId);

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
          borderColor: "var(--mantine-primary-color-light)",
          borderWidth: 4,
          borderStyle: "solid",
          color: "var(--mantine-primary-color-light-color)",
          display: "flex",
          alignItems: "center",
          zIndex: 99,
        }}
      >
        <Menu shadow="md" position="top" withArrow withinPortal>
          <Menu.ContextMenu>
            <Box w="100%" style={{ overflow: "hidden" }} h="100%">
              <Flex
                style={{
                  flexDirection: "column",
                }}
              >
                {/* controls and text */}
                <Flex
                  w="100%"
                  style={{
                    justifyContent: "space-between",
                    height: "48px",
                    borderColor: "var(--mantine-primary-color-light)",
                    borderStyle: "solid",
                    borderWidth: "0 0 4px 0",
                    alignItems: "center",
                  }}
                  px="md"

                  onPointerDown={(e) => e.stopPropagation()} // controls bar: don't start a dnd-kit drag (it swallows clicks and clears the caret)
                >
                  {/* <Text size="xs">{section.name || "Untitled"}</Text> */}
                  <CustomTextInput value={section.name || "Untitled"} flex={1} />

                  <Flex flex={2} />
                  <Group>
                    {/* Beats / Time mode */}
                    <SegmentedControl
                      size="xs"
                      data={[
                        { label: "BPM", value: TimelineSectionType.BEAT },
                        { label: "Time", value: TimelineSectionType.TIME },
                      ]}
                    />

                    <Text c="dimmed" size="sm">
                      Bars
                    </Text>
                    <Box style={{ width: "4rem" }}>
                      {/* (Beats) Bars (but actually convert to beats later) */}
                      <NumberInput size="xs" placeholder="Bar count" />
                    </Box>
                    <Divider orientation="vertical" />

                    {/* (Beats) Time Signature */}
                    <Text c="dimmed" size="sm">
                      Time Signature
                    </Text>
                    <Box style={{ width: "4rem" }}>
                      <Select data={COMMON_TIME_SIGNATURES} size="xs" />
                    </Box>

                    <Divider orientation="vertical" />

                    <Text c="dimmed" size="sm">
                      BPM
                    </Text>
                    {/* (Beats) BPM */}
                    <Box style={{ width: "4rem" }}>
                      <NumberInput size="xs" placeholder="BPM" defaultValue="120" />
                    </Box>
                    {/* (Beats) Snap Division */}
                    <Text c="dimmed" size="sm">
                      Snap
                    </Text>
                    <Box style={{ width: "4rem" }}>
                      <Select data={SNAP_DIVISIONS} size="xs" />
                    </Box>
                  </Group>
                </Flex>
              </Flex>
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
