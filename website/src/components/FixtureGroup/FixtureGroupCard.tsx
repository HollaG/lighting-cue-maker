import { Box, Button, Card, Center, Flex, Group, Stack } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { useState } from "react";
import { createEmptyEventFormAttribute, type EventFormKey, type EventFormValues } from "../EventForm/eventFormModel";
import { CustomTextInput } from "../CustomTextInput/CustomTextInput";
import { AddAttributeCard } from "./Attribute/AddAttributeCard/AddAttributeCard";

export const FixtureGroupCard = ({
  formKey,
  form,
  index,
  onDeleteFixtureGroup,
}: {
  formKey: EventFormKey;
  form: UseFormReturnType<EventFormValues>;
  index: number;
  onDeleteFixtureGroup: () => void;
}) => {
  const fixtureGroupPath = `fixtureGroups.${formKey}`;
  const attributesPath = `${fixtureGroupPath}.attributes`;
  const attributeOrderPath = `${fixtureGroupPath}.attributeOrder`;
  const fixtureGroup = form.getValues().fixtureGroups[formKey];
  const [attributeOrder, setAttributeOrder] = useState<EventFormKey[]>(fixtureGroup.attributeOrder);

  const setAttributeOrderInStateAndForm = (nextOrder: EventFormKey[]) => {
    setAttributeOrder(nextOrder);
    form.setFieldValue(attributeOrderPath, nextOrder);
  };

  const addAttribute = () => {
    const attribute = createEmptyEventFormAttribute(attributeOrder.length);
    form.setFieldValue(`${attributesPath}.${attribute.clientId}`, attribute);
    setAttributeOrderInStateAndForm([...attributeOrder, attribute.clientId]);
  };

  const removeAttribute = (attributeClientId: EventFormKey) => {
    const nextAttributes = { ...form.getValues().fixtureGroups[formKey].attributes };
    delete nextAttributes[attributeClientId];

    form.setFieldValue(attributesPath, nextAttributes);
    setAttributeOrderInStateAndForm(attributeOrder.filter((clientId) => clientId !== attributeClientId));
  };

  return (
    <Card withBorder>
      <Stack>
        <Group>
          <Box flex={1}>
            <CustomTextInput
              withAsterisk
              label={`Light group ${index + 1} name`}
              placeholder="Enter a name..."
              name={`${fixtureGroupPath}.name`}
              key={form.key(`${fixtureGroupPath}.name`)}
              {...form.getInputProps(`${fixtureGroupPath}.name`)}
            />
          </Box>

          <Flex mt="md" justify="end" style={{ flexShrink: 1 }}>
            <Button type="button" variant="transparent" size="xs" color="red" onClick={onDeleteFixtureGroup}>
              Remove group
            </Button>
          </Flex>
        </Group>

        {attributeOrder.map((attributeClientId, attributeIndex) => (
          <AddAttributeCard
            key={attributeClientId}
            attributeClientId={attributeClientId}
            fixtureGroupClientId={formKey}
            form={form}
            index={attributeIndex}
            onDeleteAttribute={() => removeAttribute(attributeClientId)}
          />
        ))}

        <Center>
          <Button type="button" variant="subtle" size="xs" onClick={addAttribute}>
            Add an attribute
          </Button>
        </Center>
      </Stack>
    </Card>
  );
};
