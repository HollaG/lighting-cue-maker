/* oxlint-disable react/only-export-components -- TanStack route modules export route metadata with their component. */
import { createFileRoute } from "@tanstack/react-router";
import { RunPage } from "../../../../pages/Run/RunPage";

export const Route = createFileRoute("/events/$eventId/run/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <RunPage />;
}
