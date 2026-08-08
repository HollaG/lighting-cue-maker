import { Collapse, Divider } from "@mantine/core";
import { EventForm } from "../../components/EventForm/EventForm";
import { eventFormValuesToCreateRequest } from "../../components/EventForm/eventFormModel";
import { useCreateEvent } from "../../query/useCreateEvent";
import { useGetEvent } from "../../query/useGetEvent";
import { useAppStore } from "../../store/appStore";

export const CreateEventWrapper = () => {
  const code = useAppStore((state) => state.code);
  const { isValidEvent } = useGetEvent({ code });
  const { isPending, mutate: createEvent } = useCreateEvent();

  if (isValidEvent) return null;

  return (
    <Collapse expanded={!isValidEvent}>
      <Divider my="lg" label="or, create a new event" labelPosition="center" />
      <EventForm
        mode="create"
        isSubmitting={isPending}
        onSubmit={(values) => createEvent(eventFormValuesToCreateRequest(values))}
      />
    </Collapse>
  );
};
