import { Alert, Button, Container, Flex, Group, TextInput, Tooltip } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { EventForm } from "../../components/EventForm/EventForm";
import { eventFormValuesToCreateRequest } from "../../components/EventForm/eventFormModel";
import { useCreateEvent } from "../../query/event/useCreateEvent";
import { notifications } from "../../utils/notifications";
import { CustomTextInput } from "../../components/CustomTextInput/CustomTextInput";
import { useDuplicateEvent } from "../../query/event/useDuplicateEvent";

export const CreateEventPage = () => {
  const navigate = useNavigate();

  const { mutateAsync: createEvent, isPending: isCreating } = useCreateEvent();
  const { mutateAsync: duplicateEvent, isPending: isDuplicating } = useDuplicateEvent();

  return (
    <Container size="fluid" py="4rem">
      <Container size="xl">
        <Group mb="2rem">
          <Button
            type="button"
            leftSection={<IconArrowLeft width="1rem" />}
            variant="transparent"
            onClick={() => navigate({ to: "/" })}
          >
            Back to home
          </Button>
          <Flex flex={1} />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const eventIdToDuplicate = formData.get("eventIdToDuplicate") as string;

              if (eventIdToDuplicate) {
                duplicateEvent({ eventId: eventIdToDuplicate }).then((res) => {
                  if (res?.newEventId) {
                    navigate({ to: `/events/${res.newEventId}/edit`, search: { from: "create" } });

                    notifications.show({
                      title: "Event duplicated",
                      message: `Successfully duplicated the event. You can now edit the new event.`,
                      color: "green",
                    });
                  } else {
                    notifications.show({
                      title: "Error duplicating event",
                      message: "An error occurred while duplicating the event. Please try again.",
                      color: "red",
                    });
                  }
                });
              } else {
                notifications.show({
                  title: "Error duplicating event",
                  message: "Please enter a valid event ID",
                  color: "red",
                });
              }
            }}
          >
            <TextInput
              placeholder="Event ID to duplicate"
              name="eventIdToDuplicate"
              rightSection={
                <Tooltip
                  multiline
                  w={300}
                  withArrow
                  position="top"

                  label="Duplicate an existing event by copying only its settings. Cues and Items will not be copied."
                >
                  <Button
                    type="submit"
                    size="xs"
                    variant="transparent"
                    loading={isDuplicating}
                    loaderProps={{
                      type: "bars",
                    }}
                  >
                    Duplicate
                  </Button>
                </Tooltip>
              }
              rightSectionWidth={90}
            />
          </form>
        </Group>
      </Container>

      <EventForm
        mode="create"
        onSubmit={(values) => {
          console.log(values);
          const config = eventFormValuesToCreateRequest(values);
          console.log({ config });
          createEvent(config).then((res) => {
            if (res?.event?.id) {
              navigate({ to: `/events/${res.event.id}/visuals/update`, search: { from: "create" } });
            } else {
              // throw an error
              notifications.show({
                title: "Error creating event",
                message: "An error occurred while creating the event. Please try again.",
                color: "red",
              });
            }
          });
        }}
      />
    </Container>
  );
};
