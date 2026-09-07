/* oxlint-disable react/only-export-components -- TanStack route modules export route metadata with their component. */
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
