import {
  Card,
  Group,
  Button,
  Select,
  TagsInput,
  Center,
  Box,
  Stack,
  ColorInput,
  Radio,
  Flex,
  Tooltip,
  Text,
  Accordion,
} from "@mantine/core";
import { AttributeTypes, BooleanOptions, type ColourOption, type Option } from "../../../../types/types";
import { useEffect, useRef, useState } from "react";
import { CustomTextInput } from "../../../CustomTextInput/CustomTextInput";
import type { UseFormReturnType } from "@mantine/form";
import type { EventFormKey, EventFormValues } from "../../../EventForm/eventFormModel";
const ATTRIBUTE_OPTIONS: Option<AttributeTypes>[] = [
  { label: "Text", value: AttributeTypes.TEXT },
  { label: "Select one", value: AttributeTypes.SELECT },
  { label: "Select many", value: AttributeTypes.MULTISELECT },
  { label: "Colour select", value: AttributeTypes.COLOUR },
  { label: "Slider", value: AttributeTypes.SLIDER },
  { label: "Slider with presets", value: AttributeTypes.SLIDER_PRESETS },
  { label: "Checkbox", value: AttributeTypes.BOOLEAN },
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
  attributeClientId,
  form,
  fixtureGroupClientId,
  index,
  deleteDisabled = false,
  onDeleteAttribute,
}: {
  attributeClientId: EventFormKey;
  form: UseFormReturnType<EventFormValues>;
  fixtureGroupClientId: EventFormKey;
  index: number;
  deleteDisabled?: boolean;
  onDeleteAttribute: () => void;
}) => {
  // Not related to form data. Used to determine which type of input that the user can do for
  // the attribute type selected.
  // we cannot use a controlled component here because the form is in uncontrolled mode.
  const baseFieldName = `fixtureGroups.${fixtureGroupClientId}.attributes.${attributeClientId}`;
  const opvFieldName = `${baseFieldName}.optionPossibleValues`;
  const metadataFieldName = `${baseFieldName}.metadata`;
  const initialType = form.getValues().fixtureGroups[fixtureGroupClientId].attributes[attributeClientId].type;
  const initialColourOptions =
    form.getValues().fixtureGroups[fixtureGroupClientId].attributes[attributeClientId].optionPossibleValues[
      AttributeTypes.COLOUR
    ] ?? [];
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeTypes | null>(
    initialType === AttributeTypes.NONE ? null : initialType,
  );

  form.watch(`${baseFieldName}.type`, ({ value }) => {
    const nextValue = value as unknown as AttributeTypes | undefined;
    setSelectedAttribute(nextValue === undefined || nextValue === AttributeTypes.NONE ? null : nextValue);
  });

  return (
    <Card py={0}>
      <Group>
        {/* <Text size="sm" flex={1}> Attribute 1 </Text> */}
        <Box flex={1}>
          <CustomTextInput
            style={{ width: "100%" }}
            label={`Attribute ${index + 1} name`}
            placeholder="e.g. Intensity, Colour, Position"
            name={`${baseFieldName}.name`}
            key={form.key(`${baseFieldName}.name`)}
            {...form.getInputProps(`${baseFieldName}.name`)}
            required
          />
        </Box>
        <Flex mt={"md"} justify={"end"} style={{ flexShrink: 1 }}>
          <Tooltip label="Deleting existing attributes is not supported yet." disabled={!deleteDisabled}>
            <span>
              <Button
                type="button"
                variant="transparent"
                size="xs"
                color="red"
                disabled={deleteDisabled}
                onClick={onDeleteAttribute}
              >
                Remove attribute
              </Button>
            </span>
          </Tooltip>
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
            <SelectOptionsHandler optionType={selectedAttribute} opvFieldName={opvFieldName} form={form} />
          )}

          {selectedAttribute === AttributeTypes.COLOUR && (
            <ColourOptionsHandler initialColours={initialColourOptions} opvFieldName={opvFieldName} form={form} />
          )}

          {selectedAttribute === AttributeTypes.BOOLEAN && (
            <BooleanOptionsHandler opvFieldName={opvFieldName} form={form} />
          )}
          {selectedAttribute === AttributeTypes.SLIDER_PRESETS && (
            <SliderPresetsOptionsHandler opvFieldName={opvFieldName} form={form} />
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

      <Box>
        <Group>
          {/* <Text fw="bold" fz="sm" flex={1}>
            Advanced options{" "}
          </Text> */}
        </Group>

        <Accordion variant="unstyled">
          <Accordion.Item key="required" value="required">
            <Accordion.Control px={0}>
              <Text fw="600" fz="sm">
                {" "}
                Advanced options
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Radio.Group
                name={`${metadataFieldName}.required`}
                key={form.key(`${metadataFieldName}.required`)}
                {...form.getInputProps(`${metadataFieldName}.required`)}
                label="Is required"
                withAsterisk
                // defaultValue={"false"}
                // onChange={(value) => {
                //   form.setFieldValue(`${metadataFieldName}.required`, value === "true");
                // }}
              >
                <Group mt="xs">
                  <Radio value={"false"} label="Optional" />
                  <Radio style={{ cursor: "pointer" }} value={"true"} label="Required" />
                </Group>
              </Radio.Group>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Box>

      {/* {selectedAttribute === 'slider' && <MultiSelectCreatable />}
    {selectedAttribute === 'boolean' && <MultiSelectCreatable />}
    {selectedAttribute === 'text' && <MultiSelectCreatable />} */}
    </Card>
  );
};

const SelectOptionsHandler = ({
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

// need to specify hex code
const ColourOptionsHandler = ({
  initialColours,
  opvFieldName,
  form,
}: {
  initialColours: ColourOption[];
  opvFieldName: string;
  form: UseFormReturnType<any>;
}) => {
  // list of colours
  opvFieldName = `${opvFieldName}.${AttributeTypes.COLOUR}`;

  const [colorInputIds, setColorInputIds] = useState<string[]>(() =>
    initialColours.length > 0 ? initialColours.map((_, index) => `existing-colour-${index}`) : [Date.now().toString()],
  );
  const initializedEmptyColour = useRef(false);

  useEffect(() => {
    if (initialColours.length > 0 || initializedEmptyColour.current) return;
    initializedEmptyColour.current = true;

    form.setFieldValue(`${opvFieldName}.0`, {
      hex: "",
      name: "",
    });
  }, [form, initialColours.length, opvFieldName]);

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
            <Button
              type="button"
              variant="transparent"
              size="xs"
              color="red"
              onClick={() => onDeleteColourOption(index)}
            >
              {" "}
              Remove option
            </Button>
          </Box>
        </Group>
      ))}
      <Center>
        <Button type="button" variant="subtle" size="xs" onClick={() => onAddNewColourOption(colorInputIds.length)}>
          {" "}
          Add another colour
        </Button>
      </Center>
    </Stack>
  );
};

// specify default value
const BooleanOptionsHandler = ({ opvFieldName, form }: { opvFieldName: string; form: UseFormReturnType<any> }) => {
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

const SliderPresetsOptionsHandler = ({
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
