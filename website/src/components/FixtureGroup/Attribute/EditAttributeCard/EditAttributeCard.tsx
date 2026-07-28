import { Card, Group, Select, TagsInput, Box, Stack, ColorInput, Radio, Button, Center } from "@mantine/core";
import { AttributeTypes, type Option } from "../../../../types/types";
import { useMemo, useState } from "react";
import { CustomTextInput } from "../../../CustomTextInput/CustomTextInput";
import type { UseFormReturnType } from "@mantine/form";

const ATTRIBUTE_OPTIONS: Option<AttributeTypes>[] = [
  { label: "Text", value: AttributeTypes.TEXT },
  { label: "Select one", value: AttributeTypes.SELECT },
  { label: "Select many", value: AttributeTypes.MULTISELECT },
  { label: "Colour select", value: AttributeTypes.COLOUR },
  { label: "Slider", value: AttributeTypes.SLIDER },
  { label: "Checkbox", value: AttributeTypes.BOOLEAN },
];

/**
 * Edit-mode attribute card. Receives pre-populated values via the form's initialValues
 * rather than initializing them via useEffect like AddAttributeCard.
 *
 * @param attributeId The real UUID of the attribute from the backend
 * @param fixtureGroupId The real UUID of the parent fixture group
 * @param form The Mantine form instance
 * @param index Display index
 */
export const EditAttributeCard = ({
  attributeId,
  fixtureGroupId,
  form,
  index,
}: {
  attributeId: string;
  fixtureGroupId: string;
  form: UseFormReturnType<any>;
  index: number;
}) => {
  const baseFieldName = `fixtureGroups.${fixtureGroupId}.attributes.${attributeId}`;
  const opvFieldName = `${baseFieldName}.optionPossibleValues`;

  // Read the current type from form values to determine which options handler to show
  const currentType = form.getValues()?.fixtureGroups?.[fixtureGroupId]?.attributes?.[attributeId]?.type ?? null;
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeTypes | null>(currentType);

  form.watch(`${baseFieldName}.type`, ({ value }) => {
    setSelectedAttribute(value);
  });

  return (
    <Card py={0}>
      <Group>
        <Box flex={1}>
          <CustomTextInput
            style={{ width: "100%" }}
            label={`Attribute ${index + 1} name`}
            placeholder="e.g. Intensity, Colour, Position"
            name={`${baseFieldName}.name`}
            key={form.key(`${baseFieldName}.name`)}
            {...form.getInputProps(`${baseFieldName}.name`)}
          />
        </Box>
      </Group>

      <Group style={{ flexWrap: "nowrap", alignItems: "start" }}>
        <Box
          style={{
            flex: selectedAttribute ? 1 : 4,
            transition: "flex 0.3s ease",
            minWidth: 0,
          }}
        >
          <Select
            label="Input type"
            placeholder="Pick an attribute"
            data={ATTRIBUTE_OPTIONS}
            allowDeselect={false}
            name={`${baseFieldName}.type`}
            key={form.key(`${baseFieldName}.type`)}
            {...form.getInputProps(`${baseFieldName}.type`)}
          />
        </Box>

        <Box
          style={{
            flex: selectedAttribute ? 3 : 0,
            overflow: "hidden",
            transition: "flex 0.3s ease",
            minWidth: 0,
          }}
        >
          {(selectedAttribute === AttributeTypes.MULTISELECT || selectedAttribute === AttributeTypes.SELECT) && (
            <EditSelectOptionsHandler opvFieldName={opvFieldName} form={form} />
          )}

          {selectedAttribute === AttributeTypes.COLOUR && (
            <EditColourOptionsHandler
              opvFieldName={opvFieldName}
              form={form}
              fixtureGroupId={fixtureGroupId}
              attributeId={attributeId}
            />
          )}

          {selectedAttribute === AttributeTypes.BOOLEAN && (
            <EditBooleanOptionsHandler opvFieldName={opvFieldName} form={form} />
          )}
        </Box>
      </Group>
    </Card>
  );
};

const EditSelectOptionsHandler = ({ opvFieldName, form }: { opvFieldName: string; form: UseFormReturnType<any> }) => {
  opvFieldName = `${opvFieldName}.${AttributeTypes.SELECT}`;

  return (
    <TagsInput
      name={opvFieldName}
      key={form.key(opvFieldName)}
      {...form.getInputProps(opvFieldName)}
      label="Options"
      placeholder="Press enter to add"
    />
  );
};

const EditColourOptionsHandler = ({
  opvFieldName,
  form,
  fixtureGroupId,
  attributeId,
}: {
  opvFieldName: string;
  form: UseFormReturnType<any>;
  fixtureGroupId: string;
  attributeId: string;
}) => {
  opvFieldName = `${opvFieldName}.${AttributeTypes.COLOUR}`;

  // Read the initial colour count from form values
  const initialColours: any[] =
    form.getValues()?.fixtureGroups?.[fixtureGroupId]?.attributes?.[attributeId]?.optionPossibleValues?.colour ?? [];
  const initialIds = useMemo(() => initialColours.map((_, i) => `existing-${i}`), []);
  const [colorInputIds, setColorInputIds] = useState<string[]>(initialIds.length > 0 ? initialIds : ["new-0"]);

  const onAddNewColourOption = (index: number) => {
    const id = `new-${Date.now()}`;
    setColorInputIds((prev) => [...prev, id]);
    form.setFieldValue(`${opvFieldName}.${index}`, {
      hex: "",
      name: "",
    });
  };

  const onDeleteColourOption = (index: number) => {
    setColorInputIds((prev) => prev.filter((_, i) => i !== index));
    form.removeListItem(opvFieldName, index);
  };

  return (
    <Stack>
      {colorInputIds.map((colorInputId, index) => (
        <Group key={colorInputId}>
          <Box flex={5}>
            <ColorInput
              variant="unstyled"
              label="Colour"
              withAsterisk
              placeholder="Input placeholder"
              name={`${opvFieldName}.${index}.hex`}
              key={form.key(`${opvFieldName}.${index}.hex`)}
              {...form.getInputProps(`${opvFieldName}.${index}.hex`)}
              withEyeDropper={false}
              swatches={[
                "#ffffff",
                "#ffbf00",
                "#ff0000",
                "#00ff00",
                "#0000ff",
                "#00ffff",
                "#ff00ff",
                "#ffff00",
                "#800080",
                "#FFC0CB",
                "#fd7e14",
              ]}
            />
          </Box>
          <Box flex={5}>
            <CustomTextInput
              label="Colour name"
              placeholder="e.g. Red"
              withAsterisk
              name={`${opvFieldName}.${index}.name`}
              key={form.key(`${opvFieldName}.${index}.name`)}
              {...form.getInputProps(`${opvFieldName}.${index}.name`)}
            />
          </Box>
          <Box flex={1}>
            <Button variant="transparent" size="xs" color="red" onClick={() => onDeleteColourOption(index)}>
              Remove option
            </Button>
          </Box>
        </Group>
      ))}
      <Center>
        <Button variant="subtle" size="xs" onClick={() => onAddNewColourOption(colorInputIds.length)}>
          Add another colour
        </Button>
      </Center>
    </Stack>
  );
};

const EditBooleanOptionsHandler = ({ opvFieldName, form }: { opvFieldName: string; form: UseFormReturnType<any> }) => {
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
        <Radio value="unchecked" label="Unchecked" />
        <Radio value="checked" label="Checked" />
      </Group>
    </Radio.Group>
  );
};
