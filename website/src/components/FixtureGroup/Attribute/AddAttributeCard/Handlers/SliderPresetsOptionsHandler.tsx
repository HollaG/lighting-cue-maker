import { TagsInput } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { AttributeTypes } from "../../../../../types/types";

export const SliderPresetsOptionsHandler = ({
  opvFieldName,
  form,
}: {
  opvFieldName: string;
  form: UseFormReturnType<any>;
}) => {
  opvFieldName = `${opvFieldName}.${AttributeTypes.SLIDER_PRESETS}`;

  return (
    <TagsInput
      required
      name={opvFieldName}
      type="number"
      key={form.key(opvFieldName)}
      {...form.getInputProps(opvFieldName)}
      label="Options"
      description="Only numbers are allowed"
      placeholder="Press enter to add (numbers only)"

      // onChange={(value) => {
      //   console.log({ value });
      //   // Filter out non-numeric values and sort them
      //   const numericValues = value
      //     .filter((v) => !isNaN(Number(v)))
      //     .map(Number)
      //     .sort((a, b) => a - b);
      //   form.setFieldValue(opvFieldName, numericValues);
      // }}
    />
  );
};
