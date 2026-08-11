import { Group, Radio } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { AttributeTypes, BooleanOptions } from "../../../../../types/types";

// specify default value
export const BooleanOptionsHandler = ({
  opvFieldName,
  form,
}: {
  opvFieldName: string;
  form: UseFormReturnType<any>;
}) => {
  opvFieldName = `${opvFieldName}.${AttributeTypes.BOOLEAN}`;

  return (
    <Radio.Group
      name={opvFieldName}
      key={form.key(opvFieldName)}
      {...form.getInputProps(opvFieldName)}
      label="Default state"
      withAsterisk
    >
      <Group mt="xs">
        <Radio value={BooleanOptions.UNCHECKED} label="Unchecked" />
        <Radio value={BooleanOptions.CHECKED} label="Checked" />
      </Group>
    </Radio.Group>
  );
};
