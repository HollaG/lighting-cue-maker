import { Box, Button, Container, Divider, Group, Stack, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import { useCreateEvent } from "../../../../query-v2/events/useCreateEvent";
import { useGetEvent } from "../../../../query-v2/events/useGetEvent";
import { useUpdateEvent } from "../../../../query-v2/events/useUpdateEvent";
import { CustomTextInput } from "../../../CustomTextInput/CustomTextInput";
import { STEP_FORM_ID } from "../StepForm";
import { useDuplicateEvent } from "../../../../query-v2/events/useDuplicateEvent";
import { notifications } from "../../../../utils/notifications";

type EventDetailsValues = {
  name: string;
  description: string;
  externalLink: string;
};

/** Event creation and details */
export const Step1 = ({ eventId, onDone }: { eventId: string | null; onDone: (eventId: string) => void }) => {
  const { mutateAsync: duplicateEvent, isPending: isDuplicatePending } = useDuplicateEvent();

  const [duplicateEventId, setDuplicateEventId] = useState<string>("");

  const form = useForm<EventDetailsValues>({
    mode: "uncontrolled",
    initialValues: { name: "", description: "", externalLink: "" },
    validate: {
      name: (value) => (value.trim() ? null : "Give the event a name"),
    },
  });

  const { mutateAsync: createEvent } = useCreateEvent();
  const { mutateAsync: updateEvent } = useUpdateEvent();

  // Coming back to this step (or edit mode): fill the form with the saved event.
  // form.initialize only applies once, so later refetches don't overwrite what the LD is typing.
  const { event } = useGetEvent(eventId);
  useEffect(() => {
    if (!event) return;
    form.initialize({
      name: event.name,
      description: event.description ?? "",
      externalLink: event.externalLink ?? "",
    });
  }, [event]); // eslint-disable-line react-hooks/exhaustive-deps -- form is stable

  const save = async (values: EventDetailsValues) => {
    try {
      if (eventId) {
        // fixtureTemplateIds left out on purpose: sending it replaces the event's templates.
        await updateEvent({ eventId, req: { event: values } });
        onDone(eventId);
      } else {
        const res = await createEvent({ event: values, fixtureTemplateIds: [] });
        onDone(res.event.id);
      }
    } catch {
      // error notif handled by api.ts
    }
  };

  const onDuplicate = async () => {
    const res = await duplicateEvent({ eventId: duplicateEventId });
    // show duplicated toast
    notifications.show({
      title: "Event duplicated",
      message: "You can now edit the new event's details and fixtures.",
      color: "green",
    });
    onDone(res.eventId);
  };

  return (
    <Container>
      <Stack style={{ width: "100%" }} gap="xl">
        <Group>
          <CustomTextInput
            required
            label="Event code"
            placeholder="Type code of event to duplicate here..."
            value={duplicateEventId}
            onChange={(event) => setDuplicateEventId(event.target.value)}
            flex={1}
          />
          <Button
            variant="light"
            onClick={onDuplicate}
            disabled={!duplicateEventId || isDuplicatePending}
            loading={isDuplicatePending}
          >
            Duplicate
          </Button>
        </Group>

        <Box>
          <Divider label="or, create your own" />
        </Box>

        <Box flex={2}>
          <form id={STEP_FORM_ID} onSubmit={form.onSubmit(save)}>
            <Stack w="stretch">
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
            </Stack>
          </form>
        </Box>
      </Stack>
    </Container>
  );
};
