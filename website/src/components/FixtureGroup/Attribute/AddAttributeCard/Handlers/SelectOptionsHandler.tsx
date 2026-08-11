import { TagsInput } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { AttributeTypes } from "../../../../../types/types";

export const SelectOptionsHandler = ({
  optionType,
  opvFieldName,
  form,
}: {
  optionType: typeof AttributeTypes.SELECT | typeof AttributeTypes.MULTISELECT;
  opvFieldName: string;
  form: UseFormReturnType<any>;
}) => {
  opvFieldName = `${opvFieldName}.${optionType}`;

  return (
    <TagsInput
      required
      name={opvFieldName}
      key={form.key(opvFieldName)}
      {...form.getInputProps(opvFieldName)}
      label="Options"
      placeholder="Press enter to add"
    />
  );
};
