import { Alert, Button, Center, Container, Group, Loader } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { EventForm } from "../../components/EventForm/EventForm";
import {
  eventFormValuesToUpdateRequest,
  eventToEventFormValues,
  type EventFormValues,
} from "../../components/EventForm/eventFormModel";
import { useGetEvent } from "../../query/useGetEvent";
import { useUpdateEvent } from "../../query/useUpdateEvent";
import { notifications } from "../../utils/notifications";

export const EditEventPage = () => {
  const { eventId } = useParams({ from: "/events/$eventId/edit/" });
  const navigate = useNavigate();
  const { event, isLoading, isError } = useGetEvent({ eventId });

  const { mutateAsync: updateEvent, isPending: isSubmitting } = useUpdateEvent();

  const initialValues = useMemo(() => (event ? eventToEventFormValues(event) : null), [event]);

  const returnToEvent = () =>
    navigate({
      to: "/events/$eventId",
      params: { eventId },
    });

  const onSubmit = async (values: EventFormValues) => {
    try {
      await updateEvent({
        eventId,
        requestBody: eventFormValuesToUpdateRequest(values),
      });

      notifications.show({
        title: "Event updated",
        message: "Your event settings were saved successfully.",
        color: "teal",
      });

      await returnToEvent();
    } catch (error) {
      notifications.show({
        title: "Unable to update event",
        message: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        color: "red",
      });
    }
  };

  if (isLoading) {
    return (
      <Center mih="50vh">
        <Loader />
      </Center>
    );
  }

  if (isError || !event || !initialValues) {
    return (
      <Container size="xl" mt="4rem">
        <Alert color="red" title="Event not found">
          This event could not be loaded. Check the URL and try again.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" mt="4rem">
      <Group mb="2rem">
        <Button
          type="button"
          leftSection={<IconArrowLeft width="1rem" />}
          variant="transparent"
          onClick={returnToEvent}
        >
          Back to event
        </Button>
      </Group>

      <EventForm
        key={event.id}
        mode="edit"
        initialValues={initialValues}
        isSubmitting={isSubmitting}
        submitLabel="Save changes"
        bumpConfigurationsReadOnly
        onSubmit={onSubmit}
        onCancel={returnToEvent}
      />
    </Container>
  );
};
