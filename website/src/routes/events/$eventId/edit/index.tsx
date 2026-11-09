/* oxlint-disable react/only-export-components -- TanStack route modules export route metadata with their component. */
import { createFileRoute } from "@tanstack/react-router";
import { EditEventPage } from "../../../../pages/EditEvent/EditEventPage";

export const Route = createFileRoute("/events/$eventId/edit/")({
  component: EditEventPage,
  // ?step=N is the setup step (0-based). Missing or invalid = Step 1.
  validateSearch: (search: Record<string, unknown>): { step?: number } => {
    const step = Number(search.step);
    return Number.isInteger(step) && step >= 0 ? { step } : {};
  },
});
