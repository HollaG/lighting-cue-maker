import { Select } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { IconCaretDown } from "@tabler/icons-react";
import type { Cue } from "../../../types/cues";
import type { PresetPositionOption } from "../../../types/types";
import { popTransition } from "../../../utils/animations";

interface PositionSelectProps {
  name: string;
  fieldName: string;
  form: UseFormReturnType<Cue>;
  positionOptions: PresetPositionOption[];
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

export function PositionSelect({
  name,
  fieldName,
  form,
  positionOptions,
  placeholder,
  required = false,
  disabled = false,
  readOnly = false,
}: PositionSelectProps) {
  const inputProps = form.getInputProps(fieldName);
  const initialPosition = inputProps.defaultValue as PresetPositionOption | undefined;

  return (
    <Select
      comboboxProps={{ transitionProps: popTransition }}
      searchable
      label={name}
      data={positionOptions.map((position) => ({ value: position.name, label: position.name }))}
      placeholder={placeholder}
      name={fieldName}
      key={form.key(fieldName)}
      defaultValue={initialPosition?.name ?? null}
      onChange={(value) => {
        const selectedPosition = positionOptions.find((position) => position.name === value);
        form.setFieldValue(fieldName, selectedPosition ? { ...selectedPosition } : undefined);
      }}
      onBlur={inputProps.onBlur}
      error={inputProps.error}
      clearable
      rightSection={<IconCaretDown width="0.75rem" />}
      clearSectionMode="clear"
      required={required}
      disabled={disabled}
      readOnly={readOnly}
    />
  );
}
