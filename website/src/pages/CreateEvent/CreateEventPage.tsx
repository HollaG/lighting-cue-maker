import { Button, Container, Group } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { EventForm } from "../../components/EventForm/EventForm";
import { eventFormValuesToCreateRequest } from "../../components/EventForm/eventFormModel";
import { useCreateEvent } from "../../query/useCreateEvent";
import { notifications } from "../../utils/notifications";

export const CreateEventPage = () => {
  const navigate = useNavigate();

  const { mutateAsync: createEvent } = useCreateEvent();

  return (
    <Container size="fluid" mt="4rem">
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
