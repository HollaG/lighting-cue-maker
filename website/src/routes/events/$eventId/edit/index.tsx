import { createFileRoute } from "@tanstack/react-router";
import { EditEventPage } from "../../../../pages/EditEvent/EditEventPage";

export const Route = createFileRoute("/events/$eventId/edit/")({
  component: EditEventPage,
});
