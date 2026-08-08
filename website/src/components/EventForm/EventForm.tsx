import { useState } from "react";
import { Button, Center, Container, Group, SimpleGrid, Stack, TagsInput, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { CustomTextInput } from "../CustomTextInput/CustomTextInput";
import { AddFixtureGroupButton } from "../FixtureGroup/AddFixtureGroupButton/AddFixtureGroupButton";
import { FixtureGroupCard } from "../FixtureGroup/FixtureGroupCard";
import {
  createEmptyEventFormFixtureGroup,
  createEmptyEventFormValues,
  type EventFormKey,
  type EventFormProps,
  type EventFormValues,
} from "./eventFormModel";

export const EventForm = ({
  mode,
  initialValues,
  isSubmitting = false,
  submitLabel = mode === "create" ? "Create event" : "Save changes",
  bumpConfigurationsReadOnly = false,
  onSubmit,
  onCancel,
}: EventFormProps) => {
  // initialValues are intentionally read on mount. For a different backend
  // event, remount EventForm with `key={event.id}`.
  const [mountedInitialValues] = useState<EventFormValues>(() => initialValues ?? createEmptyEventFormValues());
  const [fixtureGroupOrder, setFixtureGroupOrder] = useState<EventFormKey[]>(mountedInitialValues.fixtureGroupOrder);

  const form = useForm<EventFormValues>({
    mode: "uncontrolled",
    initialValues: mountedInitialValues,
  });

  const setFixtureGroupOrderInStateAndForm = (nextOrder: EventFormKey[]) => {
    setFixtureGroupOrder(nextOrder);
    form.setFieldValue("fixtureGroupOrder", nextOrder);
  };

  const addFixtureGroup = () => {
    const fixtureGroup = createEmptyEventFormFixtureGroup(fixtureGroupOrder.length);
    form.setFieldValue(`fixtureGroups.${fixtureGroup.clientId}`, fixtureGroup);
    setFixtureGroupOrderInStateAndForm([...fixtureGroupOrder, fixtureGroup.clientId]);
  };

  const removeFixtureGroup = (formKey: EventFormKey) => {
    const nextFixtureGroups = { ...form.getValues().fixtureGroups };
    delete nextFixtureGroups[formKey];

    form.setFieldValue("fixtureGroups", nextFixtureGroups);
    setFixtureGroupOrderInStateAndForm(fixtureGroupOrder.filter((key) => key !== formKey));
  };

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Container size="xl">
        <Stack gap="md">
          <CustomTextInput
            placeholder="Type your event name here..."
            size="xxl"
            name="name"
            key={form.key("name")}
            {...form.getInputProps("name")}
          />

          <Textarea
            minRows={3}
            variant="unstyled"
            autosize
            name="description"
            key={form.key("description")}
            {...form.getInputProps("description")}
            placeholder="Type a brief description e.g. rules/remarks that choreographers can see."
            styles={{ input: { fontSize: "16px" } }}
          />

          <CustomTextInput
            label="Google Docs / OneDrive / Link"
            placeholder="Paste a link to more information, if necessary"
            name="externalLink"
            key={form.key("externalLink")}
            {...form.getInputProps("externalLink")}
          />

          <CustomTextInput
            label="How many cues per band? (optional)"
            placeholder="Enter a number..."
            name="cuesPerBand"
            type="number"
            key={form.key("cuesPerBand")}
            {...form.getInputProps("cuesPerBand")}
          />

          <CustomTextInput
            label="How many unique cues per band? (optional)"
            placeholder="Enter a number..."
            name="uniqueCuesPerBand"
            type="number"
            key={form.key("uniqueCuesPerBand")}
            {...form.getInputProps("uniqueCuesPerBand")}
          />

          <TagsInput
            name="bumpConfigurations"
            key={form.key("bumpConfigurations")}
            {...form.getInputProps("bumpConfigurations")}
            label="Define bump options"
            description="These are possible bumps (instantaneous changes in lighting) that you can do"
            placeholder="Type a name, then press enter to add"
            variant="unstyled"
            readOnly={bumpConfigurationsReadOnly}
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }} mt="sm">
            {fixtureGroupOrder.map((formKey, index) => (
              <FixtureGroupCard
                key={formKey}
                form={form}
                formKey={formKey}
                index={index}
                onDeleteFixtureGroup={() => removeFixtureGroup(formKey)}
              />
            ))}

            <AddFixtureGroupButton type="button" onClick={addFixtureGroup} />
          </SimpleGrid>

          <Center mt="xl">
            <Group>
              {onCancel && (
                <Button type="button" variant="subtle" color="gray" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" color="teal" size="lg" loading={isSubmitting}>
                {submitLabel}
              </Button>
            </Group>
          </Center>
        </Stack>
      </Container>
    </form>
  );
};
