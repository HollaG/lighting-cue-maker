import {
  Card,
  Group,
  Button,
  Select,
  Text,
  TagsInput,
  Center,
  Box,
  Stack,
  ColorInput,
  TextInput,
  Flex,
  Radio,
} from "@mantine/core";
import { MultiSelectCreatable } from "../../../MultiSelectCreatable/MultiSelectCreatable";
import { AttributeTypes, BooleanOptions, type Attribute, type Option } from "../../../../types/types";
import { useEffect, useMemo, useState } from "react";
import { CustomTextInput } from "../../../CustomTextInput/CustomTextInput";
import type { UseFormReturnType } from "@mantine/form";
import { waitNextFrame } from "../../../../utils/raf";
const ATTRIBUTE_OPTIONS: Option[] = [
  { label: "Text", value: AttributeTypes.TEXT },
  { label: "Select one", value: AttributeTypes.SELECT },
  { label: "Select many", value: AttributeTypes.MULTISELECT },
  { label: "Colour select", value: AttributeTypes.COLOUR },
  { label: "Slider", value: AttributeTypes.SLIDER },
  { label: "Checkbox", value: AttributeTypes.BOOLEAN },
];

const COLOUR_OPTIONS: Option[] = [
  { label: "Red", value: "red" },
  { label: "Green", value: "green" },
  { label: "Blue", value: "blue" },
];
/**
 *
 * @param id Generated Attribute ID
 * @param form passed down form object
 * @param fixtureGroupId ID of the parent fixture group
 * @param index Index of the attribute in the array. Used to display "Attribute 1/2 ..."
 * @param onDeleteAttribute callback to remove this card
 * @returns
 */
export const AddAttributeCard = ({
  id,
  form,
  fixtureGroupId,
  index,
  onDeleteAttribute,
}: {
  id: number;
  form: UseFormReturnType<any>;
  fixtureGroupId: number;
  index: number;
  onDeleteAttribute: (id: number) => void;
}) => {
  // Not related to form data. Used to determine which type of input that the user can do for
  // the attribute type selected.
  // we cannot use a controlled component here because the form is in uncontrolled mode.
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeTypes | null>(null);

  const tagInputAttributes = useMemo(
    () => ({
      name: `fixtureGroup.${fixtureGroupId}.attributes.${id}.optionPossibleValues`,
      key: form.key(`fixtureGroup.${fixtureGroupId}.attributes.${id}.optionPossibleValues`),
      ...form.getInputProps(`fixtureGroup.${fixtureGroupId}.attributes.${id}.optionPossibleValues`),
    }),
    [],
  );

  useEffect(() => {
    form.setFieldValue(`fixtureGroup.${fixtureGroupId}.attributes.${id}`, {
      name: "",
      type: AttributeTypes.NONE,
      metadata: new Map<string, any>(),
      optionPossibleValues: {
        [AttributeTypes.SELECT]: [],
        [AttributeTypes.MULTISELECT]: [],
        [AttributeTypes.COLOUR]: [],
        // For select and Multiselect, they link this value directly into the input itself, so it has to be an array.
        // for Colour, we have to have a type { hex: string, name: string }, so we use an object here, as we cannot use
        // and array when deleting items
        [AttributeTypes.SLIDER]: { min: 0, max: 100 },
        [AttributeTypes.BOOLEAN]: BooleanOptions.UNCHECKED,
        [AttributeTypes.TEXT]: null,
        [AttributeTypes.NONE]: null,
      },
    } as Omit<Attribute, "id">); // ID only for database

    // NOTE: This seems to be required, as otherwise the select field does NOT get set with the correct attribute type
    // setTimeout(() => {
    //   form.setFieldValue(`fixtureGroup.${fixtureGroupId}.attributes.${id}.type`, AttributeTypes.SELECT);
    // }, 1);

    waitNextFrame().then(() => {
      form.setFieldValue(`fixtureGroup.${fixtureGroupId}.attributes.${id}.type`, AttributeTypes.SELECT);
    });

    return () => {
      form.removeListItem(`fixtureGroup.${fixtureGroupId}.attributes`, id);
    };
  }, []);

  form.watch(`fixtureGroup.${fixtureGroupId}.attributes.${id}.type`, ({ previousValue, value, touched, dirty }) => {
    setSelectedAttribute(value);
  });

  const opvFieldName = `fixtureGroup.${fixtureGroupId}.attributes.${id}.optionPossibleValues`;
  return (
    <Card py={0}>
      <Group>
        {/* <Text size="sm" flex={1}> Attribute 1 </Text> */}
        <Box flex={1}>
          <CustomTextInput
            style={{ width: "100%" }}
            label={`Attribute ${index + 1} name`}
            placeholder="e.g. Intensity, Colour, Position"
            name={`fixtureGroup.${fixtureGroupId}.attributes.${id}.name`}
            key={form.key(`fixtureGroup.${fixtureGroupId}.attributes.${id}.name`)}
            {...form.getInputProps(`fixtureGroup.${fixtureGroupId}.attributes.${id}.name`)}
          />
        </Box>
        <Flex mt={"md"} justify={"end"} style={{ flexShrink: 1 }}>
          <Button variant="transparent" size="xs" color="red" onClick={() => onDeleteAttribute(id)}>
            {" "}
            Remove{" "}
          </Button>
        </Flex>
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
            label="Type"
            placeholder="Pick an attribute"
            data={ATTRIBUTE_OPTIONS}
            defaultValue={AttributeTypes.SELECT}
            // value={selectedAttribute}
            // onChange={(value) => {
            //   console.log({ value });
            //   setSelectedAttribute(value.value);
            // }}
            allowDeselect={false}
            name={`fixtureGroup.${fixtureGroupId}.attributes.${id}.type`}
            key={form.key(`fixtureGroup.${fixtureGroupId}.attributes.${id}.type`)}
            {...form.getInputProps(`fixtureGroup.${fixtureGroupId}.attributes.${id}.type`)}
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
            <SelectOptionsHandler opvFieldName={opvFieldName} form={form} />
          )}

          {selectedAttribute === AttributeTypes.COLOUR && (
            <ColourOptionsHandler opvFieldName={opvFieldName} form={form} />
          )}

          {selectedAttribute === AttributeTypes.BOOLEAN && (
            <BooleanOptionsHandler opvFieldName={opvFieldName} form={form} />
          )}

          {/* {selectedAttribute === AttributeTypes.MULTISELECT ||
            (selectedAttribute === AttributeTypes.SELECT && (
              <TagsInput {...tagInputAttributes} label="Options" placeholder="Press enter to add" />
            ))} */}
          {/* {selectedAttribute === AttributeTypes.SELECT && (
            <TagsInput {...tagInputAttributes} label="Options" placeholder="Press enter to add" />
          )}
          {selectedAttribute === AttributeTypes.COLOUR && (
            <TagsInput {...tagInputAttributes} label="Options" placeholder="Press enter to add" />
          )}
          {selectedAttribute === AttributeTypes.SLIDER && (
            <TagsInput {...tagInputAttributes} label="Options" placeholder="Press enter to add" />
          )}
          {selectedAttribute === AttributeTypes.BOOLEAN && (
            <TagsInput {...tagInputAttributes} label="Options" placeholder="Press enter to add" />
          )}
          {selectedAttribute === AttributeTypes.TEXT && (
            <TagsInput {...tagInputAttributes} label="Options" placeholder="Press enter to add" />
          )} */}
        </Box>
      </Group>

      {/* {selectedAttribute === 'slider' && <MultiSelectCreatable />}
    {selectedAttribute === 'boolean' && <MultiSelectCreatable />}
    {selectedAttribute === 'text' && <MultiSelectCreatable />} */}
    </Card>
  );
};

const SelectOptionsHandler = ({ opvFieldName, form }: { opvFieldName: string; form: UseFormReturnType<any> }) => {
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

// need to specify hex code
const ColourOptionsHandler = ({ opvFieldName, form }: { opvFieldName: string; form: UseFormReturnType<any> }) => {
  // list of colours
  opvFieldName = `${opvFieldName}.${AttributeTypes.COLOUR}`;

  const initialColorInput = useMemo(() => Date.now().toString(), []); // there should already be one input ready

  const [colourOptions, setColourOptions] = useState<Option[]>([]);
  const [colorInputIds, setColorInputIds] = useState<string[]>([initialColorInput]); // IDs for Colours are String.
  // because we have TWO inputs per colour, so the full id is ${colorInputId}-hex or ${colorInputId}-name

  useEffect(() => {
    // init the field value for this colour
    form.setFieldValue(`${opvFieldName}.0`, {
      hex: "",
      name: "",
    });

    // return () => {
    //   form.removeListItem(`${opvFieldName}`, initialColorInput);
    // };
  }, []);

  const onAddNewColourOption = (index: number) => {
    const id = Date.now().toString();
    setColorInputIds((prev) => [...prev, id]);

    // init the field value for this colour
    form.setFieldValue(`${opvFieldName}.${index}`, {
      hex: "",
      name: "",
    });
  };

  const onDeleteColourOption = (index: number) => {
    setColorInputIds((prev) => prev.filter((_, i) => i !== index));
    form.removeListItem(`${opvFieldName}`, index);
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
              {" "}
              Remove option
            </Button>
          </Box>
        </Group>
      ))}
      <Center>
        <Button variant="subtle" size="xs" onClick={() => onAddNewColourOption(colorInputIds.length)}>
          {" "}
          Add another colour
        </Button>
      </Center>
    </Stack>
  );
};

// specify min and max
const SliderOptionsHandler = () => {};

// specify default value
const BooleanOptionsHandler = ({ opvFieldName, form }: { opvFieldName: string; form: UseFormReturnType<any> }) => {
  opvFieldName = `${opvFieldName}.${AttributeTypes.BOOLEAN}`;

  console.log("BOOLEAN field name: ", opvFieldName);

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

// nothing
const TextOptionsHandler = () => {};
