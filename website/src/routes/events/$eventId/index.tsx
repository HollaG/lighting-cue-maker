import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "../../../store/appStore";
import { EventPage } from "../../../pages/Event/EventPage";
import { WebTransportProvider } from "../../../context/WebTransportProvider";

export const Route = createFileRoute("/events/$eventId/")({
  // Always update the store with the eventId from the URL params.
  beforeLoad: ({ params }) => {
    const store = useAppStore.getState();

    if (store.code !== params.eventId) {
      store.setCode(params.eventId);
    }
  },

  component: function EventRoute() {
    const { eventId } = Route.useParams();
    return (
      <WebTransportProvider eventId={eventId}>
        <EventPage />
      </WebTransportProvider>
    );
  },
});
