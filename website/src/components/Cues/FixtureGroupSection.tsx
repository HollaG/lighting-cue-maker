import { Fieldset, Stack, Text } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import type { Cue } from "../../types/cues";
import type { FixtureGroupConfiguration } from "../../types/types";
import { AttributeDisplay } from "./AttributeDisplay";

interface FixtureGroupSectionProps {
  group: FixtureGroupConfiguration;
  index: number;
  form: UseFormReturnType<Cue>;
  showFieldsetWrapper?: boolean;
  setIsAtLeastOneComboboxOpened: (value: boolean) => void;

  disabled?: boolean;
  readOnly?: boolean;
}

export function FixtureGroupSection({
  group,
  index,
  form,
  showFieldsetWrapper = true,
  setIsAtLeastOneComboboxOpened,

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
        />
      ))}
    </Stack>
  );

  if (!showFieldsetWrapper) {
    return attributes;
  }

  return (
    <Fieldset
      legend={
        <Text>
          Group {index}: {group.name}
        </Text>
      }
      style={{ backgroundColor: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))" }}
      disabled={disabled}
    >
      {attributes}
    </Fieldset>
  );
}
