import { createFileRoute } from "@tanstack/react-router";
import { UpdateVisualisationPage } from "../../../../../pages/Visualisation/UpdateVisualisationPage";

export const Route = createFileRoute("/events/$eventId/visuals/update/")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    from: search.from === "create" ? "create" : undefined,
  }),
});

function RouteComponent() {
  return <UpdateVisualisationPage />;
}
