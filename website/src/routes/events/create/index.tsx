import { createFileRoute } from "@tanstack/react-router";
import { CreateEventPage } from "../../../pages/CreateEvent/CreateEventPage";

export const Route = createFileRoute('/events/create/')({
  component: () => <CreateEventPage />
})

