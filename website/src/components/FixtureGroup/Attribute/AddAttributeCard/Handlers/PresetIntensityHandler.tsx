import { TagsInput } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { AttributeTypes } from "../../../../../types/types";

export const PresetIntensityHandler = ({
  opvFieldName,
  form,
}: {
  opvFieldName: string;
  form: UseFormReturnType<any>;
}) => {
  opvFieldName = `${opvFieldName}.${AttributeTypes.PRESET_INTENSITY}`;

  return (
    <TagsInput
      required
      name={opvFieldName}
      key={form.key(opvFieldName)}
      {...form.getInputProps(opvFieldName)}
      label="Intensities (%)"
      description="Only numbers are allowed"
      placeholder="Press enter to add (numbers only)"
    />
  );
};
