import { Input, MultiSelect, Select, Slider, Text, Tooltip } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { IconCaretDown } from "@tabler/icons-react";
import type { Cue } from "../../types/cues";
import { AttributeTypes, type AttributeConfiguration } from "../../types/types";
import { CustomTextInput } from "../CustomTextInput/CustomTextInput";
import { BooleanSelect } from "./Selects/BooleanSelect";
import { ColourSelect } from "./Selects/ColourSelect";
import { PositionSelect } from "./Selects/PositionSelect";
import type { JSX } from "react/jsx-runtime";

interface AttributeDisplayProps {
  attribute: AttributeConfiguration;
  index: number;
  form: UseFormReturnType<Cue>;
  groupId: string;

  disabled?: boolean;
  readOnly?: boolean;

  /** Show a tooltip asking the user to enable the group first. Only effective when disabled = true */
  showEnableTooltip?: boolean;
  setIsAtLeastOneComboboxOpened: (value: boolean) => void;
}

export function AttributeDisplay({
  attribute,
  index: _index,
  form,
  groupId,
  disabled = false,
  readOnly = false,
  showEnableTooltip = false,

  setIsAtLeastOneComboboxOpened,
}: AttributeDisplayProps) {
  const { name, type, optionPossibleValues } = attribute;
  const baseFieldName = `assignments.${groupId}.assignment.${attribute.id}.value`;

  let returnedComponent: JSX.Element | null = null;

  switch (type) {
    case AttributeTypes.TEXT:
      returnedComponent = (
        <CustomTextInput
          variant="default"
          label={name}
          placeholder={attribute.metadata.placeholder ?? `Input ${name}`}
          name={`${baseFieldName}.${AttributeTypes.TEXT}`}
          key={form.key(`${baseFieldName}.${AttributeTypes.TEXT}`)}
          {...form.getInputProps(`${baseFieldName}.${AttributeTypes.TEXT}`)}
          required={attribute.metadata.required}
          disabled={disabled}
          readOnly={readOnly}
        />
      );
      break;

    case AttributeTypes.SELECT:
      returnedComponent = (
        <Select
          comboboxProps={{ transitionProps: { transition: "pop", duration: 100 } }}
          searchable
          label={name}
          data={optionPossibleValues[AttributeTypes.SELECT]}
          placeholder={attribute.metadata.placeholder ?? "Pick a value"}
          name={`${baseFieldName}.${AttributeTypes.SELECT}`}
          key={form.key(`${baseFieldName}.${AttributeTypes.SELECT}`)}
          {...form.getInputProps(`${baseFieldName}.${AttributeTypes.SELECT}`)}
          clearable
          rightSection={<IconCaretDown width="0.75rem" />}
          clearSectionMode="clear"
          required={attribute.metadata.required}
          disabled={disabled}
          readOnly={readOnly}
        />
      );
      break;

    case AttributeTypes.MULTISELECT:
      returnedComponent = (
        <MultiSelect
          searchable
          label={name}
          data={optionPossibleValues[AttributeTypes.MULTISELECT]}
          placeholder={attribute.metadata.placeholder ?? "Pick one or more values"}
          name={`${baseFieldName}.${AttributeTypes.MULTISELECT}`}
          key={form.key(`${baseFieldName}.${AttributeTypes.MULTISELECT}`)}
          {...form.getInputProps(`${baseFieldName}.${AttributeTypes.MULTISELECT}`)}
          required={attribute.metadata.required}
          disabled={disabled}
          readOnly={readOnly}
        />
      );
      break;

    case AttributeTypes.COLOUR:
      returnedComponent = (
        <ColourSelect
          fieldName={`${baseFieldName}.${AttributeTypes.COLOUR}`}
          form={form}
          name={name}
          colourOptions={optionPossibleValues[AttributeTypes.COLOUR] || []}
          defaultValue={
            form.getInitialValues().assignments?.[groupId]?.assignment?.[attribute.id]?.value[AttributeTypes.COLOUR]
          }
          setIsAtLeastOneComboboxOpened={setIsAtLeastOneComboboxOpened}
          required={attribute.metadata.required}
          disabled={disabled}
          readOnly={readOnly}
        />
      );
      break;

    case AttributeTypes.PRESET_COLOUR:
      returnedComponent = (
        <ColourSelect
          fieldName={`${baseFieldName}.${AttributeTypes.PRESET_COLOUR}`}
          form={form}
          name={name}
          colourOptions={optionPossibleValues[AttributeTypes.PRESET_COLOUR] || []}
          defaultValue={
            form.getInitialValues().assignments?.[groupId]?.assignment?.[attribute.id]?.value[
              AttributeTypes.PRESET_COLOUR
            ]
          }
          setIsAtLeastOneComboboxOpened={setIsAtLeastOneComboboxOpened}
          required={attribute.metadata.required}
          disabled={disabled}
          readOnly={readOnly}
        />
      );
      break;

    case AttributeTypes.BOOLEAN:
      returnedComponent = (
        <BooleanSelect
          name={name}
          fieldName={`${baseFieldName}.${AttributeTypes.BOOLEAN}`}
          form={form}
          defaultValue={optionPossibleValues[AttributeTypes.BOOLEAN]!}
          required={attribute.metadata.required}
          disabled={disabled}
          readOnly={readOnly}
        />
      );
      break;

    case AttributeTypes.SLIDER_PRESETS:
      returnedComponent = (
        <SliderPresetInput
          name={name}
          fieldName={`${baseFieldName}.${AttributeTypes.SLIDER_PRESETS}`}
          form={form}
          marks={optionPossibleValues[AttributeTypes.SLIDER_PRESETS]!}
          required={attribute.metadata.required}
          disabled={disabled}
          readOnly={readOnly}
        />
      );
      break;

    case AttributeTypes.PRESET_INTENSITY:
      returnedComponent = (
        <SliderPresetInput
          name={name}
          fieldName={`${baseFieldName}.${AttributeTypes.PRESET_INTENSITY}`}
          form={form}
          marks={optionPossibleValues[AttributeTypes.PRESET_INTENSITY]!}
          required={attribute.metadata.required}
          disabled={disabled}
          readOnly={readOnly}
        />
      );
      break;

    case AttributeTypes.PRESET_POSITION:
      returnedComponent = (
        <PositionSelect
          name={name}
          fieldName={`${baseFieldName}.${AttributeTypes.PRESET_POSITION}`}
          form={form}
          positionOptions={optionPossibleValues[AttributeTypes.PRESET_POSITION] ?? []}
          placeholder={attribute.metadata.placeholder ?? "Pick a value"}
          required={attribute.metadata.required}
          disabled={disabled}
          readOnly={readOnly}
        />
      );
      break;

    default:
      returnedComponent = <CustomTextInput label={attribute.name} disabled={disabled} readOnly={readOnly} />;
  }

  if (showEnableTooltip && disabled) {
    return (
      <Tooltip label="Turn on this group first" position="top" withArrow>
        <span style={{ display: "block" }}>{returnedComponent}</span>
      </Tooltip>
    );
  }

  return returnedComponent;
}

interface SliderPresetInputProps {
  name: string;
  fieldName: string;
  form: UseFormReturnType<Cue>;
  marks: number[];
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

function SliderPresetInput({
  name,
  fieldName,
  form,
  marks,
  required = false,
  disabled = false,
  readOnly = false,
}: SliderPresetInputProps) {
  if (!marks || marks.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        No values available for selection
      </Text>
    );
  }

  return (
    <Input.Wrapper label={name} required={required}>
      <Slider
        key={form.key(fieldName)}
        {...form.getInputProps(fieldName)}
        mb="md"
        restrictToMarks
        marks={marks.map((mark) => ({ value: mark, label: mark.toString() }))}
        disabled={disabled || readOnly}
      />
    </Input.Wrapper>
  );
}
