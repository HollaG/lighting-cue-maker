import { TagsInput } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { AttributeTypes, type PresetPositionOption } from "../../../../../types/types";

export const PresetPositionHandler = ({
  opvFieldName,
  form,
}: {
  opvFieldName: string;
  form: UseFormReturnType<any>;
}) => {
  opvFieldName = `${opvFieldName}.${AttributeTypes.PRESET_POSITION}`;
  const inputProps = form.getInputProps(opvFieldName);
  const positions = getPositions(form, opvFieldName);

  return (
    <TagsInput
      required
      name={opvFieldName}
      key={form.key(opvFieldName)}
      {...inputProps}
      defaultValue={positions.map((position) => position.name)}
      onChange={(names) => {
        // The input edits names only, so retain the ID for every unchanged name.
        const currentPositions = getPositions(form, opvFieldName);

        console.log("PresetPositionHandler onChange", { names, currentPositions });
        form.setFieldValue(
          opvFieldName,
          names.map(
            (name) =>
              currentPositions.find((position) => position.name === name) ?? {
                id: crypto.randomUUID(),
                name,
              },
          ),
          { forceUpdate: false },
        );
      }}
      // onBlur={inputProps.onBlur}
      // error={inputProps.error}
      label="Positions"
      placeholder="Press enter to add"
    />
  );
};

const getPositions = (form: UseFormReturnType<any>, fieldName: string): PresetPositionOption[] =>
  fieldName.split(".").reduce((value, key) => value?.[key], form.getValues()) ?? [];
