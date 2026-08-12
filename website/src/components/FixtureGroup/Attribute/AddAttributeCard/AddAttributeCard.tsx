import { Card, Group, Button, Select, Box, Radio, Flex, Tooltip, Text, Accordion } from "@mantine/core";
import { AttributeTypes, type Option } from "../../../../types/types";
import { useState } from "react";
import { CustomTextInput } from "../../../CustomTextInput/CustomTextInput";
import type { UseFormReturnType } from "@mantine/form";
import type { EventFormKey, EventFormValues } from "../../../EventForm/eventFormModel";
import { SelectOptionsHandler } from "./Handlers/SelectOptionsHandler";
import { BooleanOptionsHandler } from "./Handlers/BooleanOptionsHandler";
import { SliderPresetsOptionsHandler } from "./Handlers/SliderPresetsOptionsHandler";
import { PresetIntensityHandler } from "./Handlers/PresetIntensityHandler";
import { PresetColourHandler } from "./Handlers/PresetColourHandler";
import { PresetPositionHandler } from "./Handlers/PresetPositionHandler";

const ATTRIBUTE_OPTIONS: Option<AttributeTypes>[] = [
  { label: "Text input", value: AttributeTypes.TEXT },
  { label: "Select one from list", value: AttributeTypes.SELECT },
  { label: "Select many from list", value: AttributeTypes.MULTISELECT },
  { label: "Colour select", value: AttributeTypes.COLOUR },
  { label: "Slider", value: AttributeTypes.SLIDER },
  { label: "Select one number from range", value: AttributeTypes.SLIDER_PRESETS },
  { label: "Yes or no selection", value: AttributeTypes.BOOLEAN },
];

const SELECT_OPTIONS = [
  {
    group: "Presets",
    items: [
      {
        label: "Intensity",
        value: AttributeTypes.PRESET_INTENSITY,
      },
      {
        label: "Colour",
        value: AttributeTypes.PRESET_COLOUR,
      },
      {
        label: "Position",
        value: AttributeTypes.PRESET_POSITION,
      },
    ],
  },
  {
    group: "Custom",
    items: ATTRIBUTE_OPTIONS,
  },
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
  // const initialColourOptions =
  //   form.getValues().fixtureGroups[fixtureGroupClientId].attributes[attributeClientId].optionPossibleValues[
  //     AttributeTypes.COLOUR
  //   ] ?? [];

  const initialPresetColourOptions =
    form.getValues().fixtureGroups[fixtureGroupClientId].attributes[attributeClientId].optionPossibleValues[
      AttributeTypes.PRESET_COLOUR
    ] ?? [];
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeTypes | null>(
    initialType === AttributeTypes.NONE ? null : initialType,
  );

  form.watch(`${baseFieldName}.type`, ({ value }) => {
    const nextValue = value as unknown as AttributeTypes | undefined;
    setSelectedAttribute(nextValue === undefined || nextValue === AttributeTypes.NONE ? null : nextValue);

    // Specific for presets
    // AttributeTypes.PRESET_INTENSITY: add 0, 25, 50, 75, 100 to the form
    if (nextValue === AttributeTypes.PRESET_INTENSITY) {
      form.setFieldValue(`${opvFieldName}.${AttributeTypes.PRESET_INTENSITY}`, ["0", "25", "50", "75", "100"]);
      form.setFieldValue(`${baseFieldName}.name`, "Intensity");
      form.setFieldValue(`${baseFieldName}.metadata.required`, "true"); // intensity is always required
    }

    if (nextValue === AttributeTypes.PRESET_COLOUR) {
      form.setFieldValue(`${baseFieldName}.name`, "Colour");
      form.setFieldValue(`${baseFieldName}.metadata.required`, "false"); //
    }

    if (nextValue === AttributeTypes.PRESET_POSITION) {
      form.setFieldValue(`${baseFieldName}.name`, "Position");
      form.setFieldValue(`${baseFieldName}.metadata.required`, "false"); //
    }
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
            placeholder="Choose how choreographers can input options for this attribute"
            data={SELECT_OPTIONS}
            allowDeselect={false}
            name={`${baseFieldName}.type`}
            key={form.key(`${baseFieldName}.type`)}
            {...form.getInputProps(`${baseFieldName}.type`)}

            comboboxProps={{ transitionProps: { transition: "pop", duration: 100 } }}
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

          {/* TODO: convert this to be a true colour select. For now, use the PRESET_COLOUR */}
          {/* {selectedAttribute === AttributeTypes.COLOUR && (
            <ColourOptionsHandler initialColours={initialColourOptions} opvFieldName={opvFieldName} form={form} />
          )} */}

          {selectedAttribute === AttributeTypes.BOOLEAN && (
            <BooleanOptionsHandler opvFieldName={opvFieldName} form={form} />
          )}
          {selectedAttribute === AttributeTypes.SLIDER_PRESETS && (
            <SliderPresetsOptionsHandler opvFieldName={opvFieldName} form={form} />
          )}

          {selectedAttribute === AttributeTypes.PRESET_INTENSITY && (
            <PresetIntensityHandler opvFieldName={opvFieldName} form={form} />
          )}

          {selectedAttribute === AttributeTypes.PRESET_COLOUR && (
            <PresetColourHandler initialColours={initialPresetColourOptions} opvFieldName={opvFieldName} form={form} />
          )}

          {selectedAttribute === AttributeTypes.PRESET_POSITION && (
            <PresetPositionHandler opvFieldName={opvFieldName} form={form} />
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
