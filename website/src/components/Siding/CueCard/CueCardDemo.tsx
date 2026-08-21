import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Collapse,
  Combobox,
  Fieldset,
  Group,
  Input,
  InputBase,
  MultiSelect,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
  useCombobox,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconChevronUp } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { Cue } from "../../../types/cues";
import {
  AttributeTypes,
  type AttributeConfiguration,
  type ColourOption,
  type FixtureGroupConfiguration,
} from "../../../types/types";
import { createDefaultValueAssignment } from "../../../utils/cue/cueForm";
import { CardBase } from "../CardBase";

export type CueCardDemoProps = {
  fixtureGroups: FixtureGroupConfiguration[];
  cueNumber: number;
  isCueSelected: boolean;
};

const createCustomCue = (fixtureGroups: FixtureGroupConfiguration[]): Cue => {
  const now = new Date();

  return {
    id: "custom-cue-demo",
    comments: "",
    assignments: Object.fromEntries(
      fixtureGroups.map((group) => [
        group.id,
        {
          name: group.name,
          assignment: Object.fromEntries(
            group.attributes.map((attribute) => [
              attribute.id,
              {
                name: attribute.name,
                type: attribute.type,
                value: createDefaultValueAssignment(attribute),
              },
            ]),
          ),
        },
      ]),
    ),
    createdAt: now,
    updatedAt: now,
    deletedAt: now,
  };
};

/** An interactive custom cue that only keeps its values in component state. */
export const CueCardDemo = ({ fixtureGroups, cueNumber, isCueSelected }: CueCardDemoProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const initialValues = useMemo(() => createCustomCue(fixtureGroups), [fixtureGroups]);
  const form = useForm<Cue>({ mode: "controlled", initialValues });

  return (
    <CardBase isActive={isCueSelected} shadow={isCueSelected ? "lg" : "none"}>
      <Stack gap={0}>
        <Group mb="md">
          <Title order={4}>Cue {cueNumber}</Title>
          {/* <Badge variant="light" color="gray">
            Demo only — not saved
          </Badge> */}
          <ActionIcon
            ml="auto"
            variant="light"
            color="gray"
            aria-label={isCollapsed ? "Expand cue" : "Collapse cue"}
            onClick={() => setIsCollapsed((current) => !current)}
          >
            <IconChevronUp
              width="1rem"
              style={{
                transition: "transform 0.2s",
                transform: isCollapsed ? "rotate(180deg)" : undefined,
              }}
            />
          </ActionIcon>
        </Group>

        <Collapse expanded={!isCollapsed}>
          {fixtureGroups.length === 0 ? (
            <Text c="dimmed" mb="md">
              No fixture groups provided.
            </Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 2 }} mb="md">
              {fixtureGroups.map((group, index) => (
                <Fieldset
                  key={group.id}
                  legend={
                    <Text>
                      Group {index + 1}: {group.name}
                    </Text>
                  }
                >
                  <Stack gap="xs">
                    {group.attributes.map((attribute) => (
                      <DemoAttributeInput key={attribute.id} attribute={attribute} groupId={group.id} form={form} />
                    ))}
                  </Stack>
                </Fieldset>
              ))}
            </SimpleGrid>
          )}
        </Collapse>

        <Textarea
          label="Comments"
          minRows={1}
          maxRows={4}
          autosize
          variant="unstyled"
          placeholder="Write any comments regarding this cue here..."
          {...form.getInputProps("comments")}
        />
      </Stack>
    </CardBase>
  );
};

const DemoAttributeInput = ({
  attribute,
  groupId,
  form,
}: {
  attribute: AttributeConfiguration;
  groupId: string;
  form: ReturnType<typeof useForm<Cue>>;
}) => {
  const fieldName = `assignments.${groupId}.assignment.${attribute.id}.value.${attribute.type}`;
  const commonProps = {
    label: attribute.name,
    required: attribute.metadata.required,
  };

  switch (attribute.type) {
    case AttributeTypes.TEXT:
      return (
        <TextInput
          {...commonProps}
          placeholder={attribute.metadata.placeholder ?? `Input ${attribute.name}`}
          {...form.getInputProps(fieldName)}
        />
      );

    case AttributeTypes.SELECT:
      return (
        <Select
          comboboxProps={{ transitionProps: { transition: "pop", duration: 100 } }}
          {...commonProps}
          searchable
          clearable
          data={attribute.optionPossibleValues[AttributeTypes.SELECT] ?? []}
          placeholder={attribute.metadata.placeholder ?? "Pick a value"}
          {...form.getInputProps(fieldName)}
        />
      );

    case AttributeTypes.MULTISELECT:
      return (
        <MultiSelect
          {...commonProps}
          searchable
          data={attribute.optionPossibleValues[AttributeTypes.MULTISELECT] ?? []}
          placeholder={attribute.metadata.placeholder ?? "Pick one or more values"}
          {...form.getInputProps(fieldName)}
        />
      );

    case AttributeTypes.COLOUR: {
      const options = attribute.optionPossibleValues[AttributeTypes.COLOUR] ?? [];
      const selected = form.getValues().assignments[groupId]?.assignment[attribute.id]?.value[AttributeTypes.COLOUR];

      return (
        <DemoColourSelect
          name={attribute.name}
          fieldName={fieldName}
          colourOptions={options}
          selected={selected}
          required={attribute.metadata.required}
          form={form}
        />
      );
    }

    case AttributeTypes.PRESET_COLOUR: {
      const options = attribute.optionPossibleValues[AttributeTypes.PRESET_COLOUR] ?? [];
      const selected =
        form.getValues().assignments[groupId]?.assignment[attribute.id]?.value[AttributeTypes.PRESET_COLOUR];

      return (
        <DemoColourSelect
          name={attribute.name}
          fieldName={fieldName}
          colourOptions={options}
          selected={selected}
          required={attribute.metadata.required}
          form={form}
        />
      );
    }

    case AttributeTypes.SLIDER: {
      const range = attribute.optionPossibleValues[AttributeTypes.SLIDER] ?? { min: 0, max: 100 };
      return (
        <Input.Wrapper {...commonProps}>
          <Slider min={range.min} max={range.max} labelAlwaysOn mt="xl" mb="md" {...form.getInputProps(fieldName)} />
        </Input.Wrapper>
      );
    }

    case AttributeTypes.SLIDER_PRESETS: {
      const values = attribute.optionPossibleValues[AttributeTypes.SLIDER_PRESETS] ?? [];
      if (values.length === 0) return <Text c="dimmed">No values available for {attribute.name}.</Text>;

      return (
        <Input.Wrapper {...commonProps}>
          <Slider
            restrictToMarks
            marks={values.map((value) => ({ value, label: String(value) }))}
            min={Math.min(...values)}
            max={Math.max(...values)}
            mt="xl"
            mb="md"
            {...form.getInputProps(fieldName)}
          />
        </Input.Wrapper>
      );
    }

    case AttributeTypes.PRESET_INTENSITY: {
      const values = attribute.optionPossibleValues[AttributeTypes.PRESET_INTENSITY] ?? [];
      if (values.length === 0) return <Text c="dimmed">No values available for {attribute.name}.</Text>;

      return (
        <Input.Wrapper {...commonProps}>
          <Slider
            restrictToMarks
            marks={values.map((value) => ({ value, label: String(value) }))}
            min={Math.min(...values)}
            max={Math.max(...values)}
            mt="xl"
            mb="md"
            {...form.getInputProps(fieldName)}
          />
        </Input.Wrapper>
      );
    }

    case AttributeTypes.BOOLEAN:
      return <Checkbox {...commonProps} {...form.getInputProps(fieldName, { type: "checkbox" })} />;

    case AttributeTypes.NONE:
      return null;
  }
};

const DemoColourSelect = ({
  name,
  fieldName,
  colourOptions,
  selected,
  required,
  form,
}: {
  name: string;
  fieldName: string;
  colourOptions: ColourOption[];
  selected?: ColourOption;
  required?: boolean;
  form: ReturnType<typeof useForm<Cue>>;
}) => {
  const [search, setSearch] = useState(selected?.name ?? "");
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const filteredOptions = colourOptions.filter((colour) =>
    colour.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(colourName) => {
        const colour = colourOptions.find((option) => option.name === colourName);
        if (!colour) return;

        form.setFieldValue(fieldName, colour);
        setSearch(colour.name);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target targetType="input">
        <div>
          <InputBase
            label={name}
            required={required}
            value={search}
            placeholder="Search colour"
            rightSection={<Combobox.Chevron />}
            rightSectionPointerEvents="none"
            leftSection={<ColourSwatch colour={selected} />}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              combobox.openDropdown();
              combobox.updateSelectedOptionIndex();
            }}
            onClick={() => {
              setSearch("");
              combobox.openDropdown();
            }}
            onFocus={() => {
              setSearch("");
              combobox.openDropdown();
            }}
            onBlur={() => {
              combobox.closeDropdown();
              setSearch(selected?.name ?? "");
            }}
          />
          <Button
            size="xs"
            variant="transparent"
            color="gray"
            onClick={() => {
              form.setFieldValue(fieldName, { name: "", hex: "" });
              setSearch("");
            }}
          >
            Clear
          </Button>
        </div>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((colour) => (
              <Combobox.Option key={colour.hex} value={colour.name}>
                <Group gap="xs">
                  <ColourSwatch colour={colour} />
                  <Text>{colour.name}</Text>
                </Group>
              </Combobox.Option>
            ))
          ) : (
            <Combobox.Empty>Nothing found</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};

const ColourSwatch = ({ colour }: { colour?: ColourOption }) => (
  <Box
    style={{
      width: "1rem",
      height: "1rem",
      borderRadius: "4px",
      backgroundColor: colour?.hex,
      border: colour?.hex === "#ffffff" ? "2px solid light-dark(black, transparent)" : undefined,
    }}
  />
);
