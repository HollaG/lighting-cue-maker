import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "../../../store/appStore";
import { EventPage } from "../../../pages/Event/EventPage";

export const Route = createFileRoute("/events/$eventId/")({
  // Always update the store with the eventId from the URL params.
  beforeLoad: ({ params }) => {
    const store = useAppStore.getState();

    if (store.code !== params.eventId) {
      store.setCode(params.eventId);
    }
  },

  component: () => {
    // const { EventPage } = await import("../../../pages/EventPage/EventPage");
    return <EventPage />;
  },
});
