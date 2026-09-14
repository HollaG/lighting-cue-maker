import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ActionIcon, Box, Group } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import type { ReactNode } from "react";

export function SortableAttribute({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <Group
      ref={setNodeRef}
      align="flex-start"
      wrap="nowrap"
      gap="xs"
      style={{
        // Keep each card's dimensions when dragging across attributes of different heights.
        transform: CSS.Translate.toString(transform),
        transition,
        position: "relative",
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      <ActionIcon
        ref={setActivatorNodeRef}
        type="button"
        variant="subtle"
        color="gray"
        mt="md"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${label}`}
        style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none", flexShrink: 0 }}
      >
        <IconGripVertical size={18} />
      </ActionIcon>
      <Box style={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Group>
  );
}
