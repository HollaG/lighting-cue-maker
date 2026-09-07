import { Center, Divider, Fieldset, Flex, Group, Stack, Switch, Text, Tooltip } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import type { Cue } from "../../types/cues";
import type { FixtureGroupConfiguration } from "../../types/types";
import { AttributeDisplay } from "./AttributeDisplay";
import { IconInfoSquareRounded } from "@tabler/icons-react";

interface FixtureGroupSectionProps {
  group: FixtureGroupConfiguration;
  index: number;
  form: UseFormReturnType<Cue>;

  /** Whether to show the Fixture Group information rendered in a card, or just show the Attribute info */
  showGroupInfo?: boolean;
  setIsAtLeastOneComboboxOpened: (value: boolean) => void;

  /** Whether the inputs should be disabled. Disabled mode also cause there to be no differentiating background colour. */
  disabled?: boolean;
  readOnly?: boolean;

  /** Whether to show a tooltip to enable the group first. Only effective when disabled = true */
  showEnableTooltip?: boolean;
}

export function FixtureGroupSection({
  group,
  index,
  form,
  showGroupInfo: showFieldsetWrapper = true,
  setIsAtLeastOneComboboxOpened,
  showEnableTooltip = false,
  disabled = false,
  readOnly = false,
}: FixtureGroupSectionProps) {
  const attributes = (
    <Stack gap="xs">
      {group.attributes.map((attribute, attributeIndex) => (
        <AttributeDisplay
          groupId={group.id}
          form={form}
          key={attributeIndex}
          attribute={attribute}
          index={attributeIndex}
          setIsAtLeastOneComboboxOpened={setIsAtLeastOneComboboxOpened}
          disabled={disabled}
          readOnly={readOnly}
          showEnableTooltip={showEnableTooltip}
        />
      ))}
    </Stack>
  );

  if (!showFieldsetWrapper) {
    return attributes;
  }

  return (
    // <Fieldset
    //   legend={<Text>{group.name}</Text>}
    //   style={{ backgroundColor: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))" }}
    //   disabled={disabled}
    // >
    //   {attributes}
    // </Fieldset>

    <Stack
      p="lg"
      style={{
        borderRadius: "6px",
        backgroundColor: disabled
          ? "transparent"
          : "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))",
        border: "1px solid light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))",

        transition: "all 0.2s ease-in-out",
      }}
    >
      <Group>
        <Group gap="xs" align="center">
          <Text fw="bold">{group.name}</Text>
          <Tooltip label={group.description} position="top" withArrow>
            <IconInfoSquareRounded width="0.75rem" height="0.75rem" style={{ color: "var(--mantine-gray-5)" }} />
          </Tooltip>
        </Group>
        <Flex flex={1} />
        <Switch
          styles={{
            track: { cursor: "pointer" },
            input: { cursor: "pointer" },
          }}
          value={group.id}
          onLabel="ON"
          offLabel="OFF"
        />
      </Group>
      <Divider />
      {attributes}
    </Stack>
  );
}
