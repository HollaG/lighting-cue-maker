import { TagsInput } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { AttributeTypes } from "../../../../../types/types";

export const PresetPositionHandler = ({
  opvFieldName,
  form,
}: {
  opvFieldName: string;
  form: UseFormReturnType<any>;
}) => {
  opvFieldName = `${opvFieldName}.${AttributeTypes.PRESET_POSITION}`;

  return (
    <TagsInput
      required
      name={opvFieldName}
      key={form.key(opvFieldName)}
      {...form.getInputProps(opvFieldName)}
      label="Positions"
      placeholder="Press enter to add"
    />
  );
};
