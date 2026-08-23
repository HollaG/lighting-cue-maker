import { Checkbox } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import type { Cue } from "../../../types/cues";
import type { BooleanOptions } from "../../../types/types";

interface BooleanSelectProps {
  defaultValue: BooleanOptions;
  name: string;
  fieldName: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  form: UseFormReturnType<Cue>;
}

export function BooleanSelect({
  name,
  fieldName,
  form,
  required = false,
  disabled = false,
  readOnly = false,
}: BooleanSelectProps) {
  return (
    <Checkbox
      required={required}
      label={name}
      key={form.key(fieldName)}
      {...form.getInputProps(fieldName, { type: "checkbox" })}
      disabled={disabled}
      readOnly={readOnly}
      onClick={readOnly ? (event) => event.preventDefault() : undefined}
    />
  );
}
