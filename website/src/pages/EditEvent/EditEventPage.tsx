import { Alert, Button, Center, Container, Flex, Group, Loader } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { EventManagementWrapper } from "../../components/EventManagement/EventManagementWrapper";
import { useGetEvent } from "../../query-v2/events/useGetEvent";

// v2 event setup in edit mode. The v1 edit page (EventForm) is in git history.
export const EditEventPage = () => {
  const { eventId } = useParams({ from: "/events/$eventId/edit/" });
  const { step } = useSearch({ from: "/events/$eventId/edit/" });
  const navigate = useNavigate();

  const { event, isEventLoading, isEventError } = useGetEvent(eventId);

  if (isEventLoading) {
    return (
      <Center mih="50vh">
        <Loader />
      </Center>
    );
  }

  if (isEventError || !event) {
    return (
      <Container size="xl" mt="4rem">
        <Alert color="red" title="Event not found">
          This event could not be loaded. Check the URL and try again.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="fluid" py="4rem">
      <Container size="xl">
        <Group mb="2rem">
          {!eventId ? (
            <Button
              type="button"
              leftSection={<IconArrowLeft width="1rem" />}
              variant="transparent"
              onClick={() => navigate({ to: "/" })}
            >
              Back to home
            </Button>
          ) : (
            <Button
              type="button"
              leftSection={<IconArrowLeft width="1rem" />}
              variant="transparent"
              onClick={() => navigate({ to: `/events/${eventId}` })}
            >
              Back to event
            </Button>
          )}
          <Flex flex={1} />
        </Group>
      </Container>
      <EventManagementWrapper eventId={eventId} step={step} />
    </Container>
  );
};
