import { Box, Button, Card, Center, Divider, Flex, Group, Stack, Tooltip } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { useState } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableAttribute } from "./SortableAttribute";
import { createEmptyEventFormAttribute, type EventFormKey, type EventFormValues } from "../EventForm/eventFormModel";
import { CustomTextInput } from "../CustomTextInput/CustomTextInput";
import { AddAttributeCard } from "./Attribute/AddAttributeCard/AddAttributeCard";

/**
 *
 * @param formKey - The key of the fixture group in the form's fixtureGroups object.
 * @param form - The form object returned by useForm.
 * @param index - The index of the fixture group in the fixtureGroupOrder array, used for display "Group 1", "Group 2", etc.
 * @param onDeleteFixtureGroup - A callback function to be called when the fixture group is deleted.
 * @returns
 */
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
  const fixtureGroupDeleteDisabled = Boolean(fixtureGroup.id);
  const [attributeOrder, setAttributeOrder] = useState<EventFormKey[]>(fixtureGroup.attributeOrder);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const setAttributeOrderInStateAndForm = (nextOrder: EventFormKey[]) => {
    setAttributeOrder(nextOrder);
    form.setFieldValue(attributeOrderPath, nextOrder);
  };

  const addAttribute = () => {
    const attribute = createEmptyEventFormAttribute(attributeOrder.length);
    form.setFieldValue(`${attributesPath}.${attribute.clientId}`, attribute);
    setAttributeOrderInStateAndForm([...attributeOrder, attribute.clientId]);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = attributeOrder.indexOf(String(active.id));
    const newIndex = attributeOrder.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    // Move only the stable IDs so uncontrolled inputs keep their values and identity.
    setAttributeOrderInStateAndForm(arrayMove(attributeOrder, oldIndex, newIndex));
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
            <CustomTextInput
              // withAsterisk
              label={`Description`}
              placeholder="Explain briefly what this group does."
              name={`${fixtureGroupPath}.description`}
              key={form.key(`${fixtureGroupPath}.description`)}
              {...form.getInputProps(`${fixtureGroupPath}.description`)}
              maxLength={100}
            />
          </Box>

          <Flex mt="md" justify="end" style={{ flexShrink: 1 }}>
            <Tooltip
              label="Deleting existing fixture groups is not supported yet."
              disabled={!fixtureGroupDeleteDisabled}
            >
              <span>
                <Button
                  type="button"
                  variant="transparent"
                  size="xs"
                  color="red"
                  disabled={fixtureGroupDeleteDisabled}
                  onClick={onDeleteFixtureGroup}
                >
                  Remove group
                </Button>
              </span>
            </Tooltip>
          </Flex>
        </Group>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={attributeOrder} strategy={verticalListSortingStrategy}>
            {attributeOrder.map((attributeClientId, attributeIndex) => (
              <SortableAttribute key={attributeClientId} id={attributeClientId} label={`attribute ${attributeIndex + 1}`}>
                <AddAttributeCard
                  attributeClientId={attributeClientId}
                  fixtureGroupClientId={formKey}
                  form={form}
                  index={attributeIndex}
                  deleteDisabled={Boolean(fixtureGroup.attributes[attributeClientId].id)}
                  onDeleteAttribute={() => removeAttribute(attributeClientId)}
                />
                <Divider my="sm" />
              </SortableAttribute>
            ))}
          </SortableContext>
        </DndContext>

        <Center>
          <Tooltip
            multiline
            w={350}
            label="An attribute is a characteristic of a lighting fixture, such as its colour, intensity, or position."
          >
            <Button type="button" variant="subtle" size="xs" onClick={addAttribute}>
              Add an attribute
            </Button>
          </Tooltip>
        </Center>
      </Stack>
    </Card>
  );
};
