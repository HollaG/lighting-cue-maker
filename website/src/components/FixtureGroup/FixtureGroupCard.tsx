import { Box, Button, Card, Center, Flex, Group, Stack } from "@mantine/core";
import { CustomTextInput } from "../CustomTextInput/CustomTextInput";
import { useEffect, useState } from "react";
import { AddAttributeCard } from "./Attribute/AddAttributeCard/AddAttributeCard";
import type { UseFormReturnType } from "@mantine/form";

export const FixtureGroupCard = ({
  editable: _editable,
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
    form.setFieldValue(`fixtureGroups.${id}`, {
      name: "",
      attributes: {}, // instead of a [], we use an Object
    });

    return () => {
      form.setFieldValue(`fixtureGroups.${id}`, undefined);
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
              name={`fixtureGroups.${id}.name`}
              key={form.key(`fixtureGroups.${id}.name`)}
              {...form.getInputProps(`fixtureGroups.${id}.name`)}
            />
          </Box>

          <Flex mt={"md"} justify={"end"} style={{ flexShrink: 1 }}>
            <Button variant="transparent" size="xs" color="red" onClick={() => onDeleteFixtureGroup(id)}>
              Remove group
            </Button>
          </Flex>
        </Group>

        {attributeIds.map((attributeId, index) => (
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
