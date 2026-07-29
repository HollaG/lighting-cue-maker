import { Box, Button, Card, Center, Group, Stack } from "@mantine/core";
import { CustomTextInput } from "../CustomTextInput/CustomTextInput";
import type { UseFormReturnType } from "@mantine/form";
import { EditAttributeCard } from "./Attribute/EditAttributeCard/EditAttributeCard";
import { useUpdateFixtureGroupConfig } from "../../query/useUpdateFixtureGroupConfig";
import { useUpdateAttributeConfig } from "../../query/useUpdateAttributeConfig";
import { notifications } from "@mantine/notifications";

/**
 * Edit-mode fixture group card. Displays pre-populated values from the form's initialValues.
 * Has its own Save button that PATCHes both the fixture group name and all attribute configs.
 *
 * @param fixtureGroupId Real UUID of this fixture group
 * @param attributeIds List of real attribute UUIDs belonging to this group
 * @param form Mantine form instance
 * @param index Display index
 */
export const EditFixtureGroupCard = ({
  fixtureGroupId,
  attributeIds,
  form,
  index,
}: {
  fixtureGroupId: string;
  attributeIds: string[];
  form: UseFormReturnType<any>;
  index: number;
}) => {
  const { mutateAsync: updateFixtureGroup, isPending: isSavingGroup } = useUpdateFixtureGroupConfig();
  const { mutateAsync: updateAttribute, isPending: isSavingAttr } = useUpdateAttributeConfig();

  const isSaving = isSavingGroup || isSavingAttr;

  const onSave = async () => {
    const groupValues = form.getValues()?.fixtureGroups?.[fixtureGroupId];
    if (!groupValues) return;

    try {
      // 1. PATCH the fixture group name
      await updateFixtureGroup({
        fixtureGroupId,
        requestBody: { name: groupValues.name },
      });

      // 2. PATCH each attribute in this group
      const attributes = groupValues.attributes ?? {};
      for (const attrId of Object.keys(attributes)) {
        const attr = attributes[attrId];
        if (!attr) continue;
        await updateAttribute({
          attributeId: attrId,
          requestBody: {
            name: attr.name,
            type: attr.type,
            metadata: attr.metadata ?? {},
            optionPossibleValues: attr.optionPossibleValues,
          },
        });
      }

      notifications.show({
        title: "Saved",
        message: `Light group "${groupValues.name}" updated successfully.`,
        color: "teal",
      });
    } catch {
      // Error notifications are handled by the api helper
    }
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
              name={`fixtureGroups.${fixtureGroupId}.name`}
              key={form.key(`fixtureGroups.${fixtureGroupId}.name`)}
              {...form.getInputProps(`fixtureGroups.${fixtureGroupId}.name`)}
            />
          </Box>
        </Group>

        {attributeIds.map((attributeId, attrIndex) => (
          <EditAttributeCard
            key={attributeId}
            attributeId={attributeId}
            fixtureGroupId={fixtureGroupId}
            form={form}
            index={attrIndex}
          />
        ))}

        <Center>
          {/* <Button variant="transparent" size="sm" mr="md">
            {" "}
            Add attribute{" "}
          </Button> */}
          <Button size="sm" color="teal" onClick={onSave} loading={isSaving}>
            Save light group
          </Button>
        </Center>
      </Stack>
    </Card>
  );
};
