import { Box, Button, Card, Center, Divider, Flex, Group, MultiSelect, Select, Stack, Text } from "@mantine/core";
import { CustomTextInput } from "../CustomTextInput/CustomTextInput";
import { useEffect, useState } from "react";
import {
  AttributeTypes,
  type AttributeConfiguration,
  type FixtureGroupConfiguration,
  type Option,
} from "../../types/types";
import { MultiSelectCreatable } from "../MultiSelectCreatable/MultiSelectCreatable";
import { AddAttributeCard } from "./Attribute/AddAttributeCard/AddAttributeCard";
import type { UseFormReturnType } from "@mantine/form";

/**
 *
 * @param editable Display mode or edit mode (unused)
 * @param id Generated Fixture Group ID
 * @param index Index of the fixture group in the array. Used to display "Fixture Group 1/2 ..."
 * @param form passed down form object
 * @param onDeleteFixtureGroup callback to remove this card
 * @returns
 */
export const FixtureGroupCard = ({
  editable,
  id,
  form,
  index,
  onDeleteFixtureGroup,
}: {
  editable: boolean;
  id: number;
  form: UseFormReturnType<any>;
  index: number;
  onDeleteFixtureGroup: (id: number) => void;
}) => {
  const [attributeIds, setAttributeIds] = useState<number[]>([]);

  // init the field value for this fixture group
  useEffect(() => {
    // ID will never change
    console.log("setting field value");
    form.setFieldValue(`fixtureGroup.${id}`, {
      name: "",
      attributes: {}, // instead of a [], we use an Object
    });

    return () => {
      form.removeListItem("fixtureGroup", id);
    };
  }, []);

  return (
    <Card withBorder>
      <Stack>
        <Group>
          <Box flex={1}>
            <CustomTextInput
              withAsterisk
              label={`Light group ${index + 1} name`}
              placeholder="Enter a name..."
              name={`fixtureGroup.${id}.name`}
              key={form.key(`fixtureGroup.${id}.name`)}
              {...form.getInputProps(`fixtureGroup.${id}.name`)}
            />
          </Box>

          <Flex mt={"md"} justify={"end"} style={{ flexShrink: 1 }}>
            <Button variant="transparent" size="xs" color="red" onClick={() => onDeleteFixtureGroup(id)}>
              Remove group
            </Button>
          </Flex>
        </Group>

        {attributeIds.map((attributeId, index) => (
          <>
            <AddAttributeCard
              key={attributeId}
              id={attributeId}
              fixtureGroupId={id}
              form={form}
              index={index}
              onDeleteAttribute={(id) => {
                setAttributeIds((prev) => prev.filter((prevId) => prevId !== id));
              }}
            />
            {/* {index !== attributeIds.length - 1 && <Divider />} */}
          </>
        ))}
        {/* <AddAttributeCard /> */}

        {/* <Select
        label="Attribute 1"
        placeholder="Pick an attribute"
        data={ATTRIBUTE_OPTIONS}
      />
      <MultiSelect
        label="Possible options"
        placeholder="Pick all options user can select"
        data={COLOUR_OPTIONS}
      /> */}
        <Center>
          <Button
            variant="subtle"
            size="xs"
            onClick={() => {
              setAttributeIds((prev) => [...prev, Date.now()]);
            }}
          >
            {" "}
            Add an attribute{" "}
          </Button>
        </Center>
      </Stack>
    </Card>
  );
};
