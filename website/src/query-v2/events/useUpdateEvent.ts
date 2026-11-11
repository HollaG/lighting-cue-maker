import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { LightEvent, UpsertLightEvent } from "../../types-v2/event";
import { makeGetEventQueryKey } from "./useGetEvent";
import { invalidateVisualiserData } from "../visualiser-data/useGetVisualiserData";

// Keep in sync with UpdateEventReq in server/internal/models/v2/event.go.
export type UpdateEventReq = {
  event?: UpsertLightEvent;
  /**
   * Leave out to keep the event's fixture templates as they are.
   * When sent, the server rebuilds the event's fixture templates from these library IDs.
   */
  fixtureTemplateIds?: string[];
};

export type UpdateEventRes = {
  event: LightEvent;
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // Same key as useCreateEvent: both are Step 1's save, so the Next button's spinner covers both.
    mutationKey: ["event-config-1"],
    mutationFn: ({ eventId, req }: { eventId: string; req: UpdateEventReq }) =>
      api.patch<UpdateEventReq, UpdateEventRes>(`/api/v2/events/${eventId}`, req),
    onSuccess: (res, { eventId, req }) => {
      // The response is the saved event, so put it straight into the cache.
      queryClient.setQueryData(makeGetEventQueryKey(eventId), res.event);
      // Only a template change affects the visualiser data, not e.g. a rename.
      if (req.fixtureTemplateIds) invalidateVisualiserData(queryClient, eventId);
    },
  });
};
