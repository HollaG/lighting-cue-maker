import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { LightEvent } from "../../types-v2/event";
import { makeGetEventQueryKey } from "./useGetEvent";
import { invalidateVisualiserData, makeGetVisualiserDataQueryKey } from "../visualiser-data/useGetVisualiserData";
import { useOptionalRealtime } from "../../context/realtime";
import { ClientMessageType } from "../../types/realtime/realtime";

// Keep in sync with UpdateEventFixtureTemplateReq in server/internal/models/v2/event.go.
/** Each field: left out = keep as is. */
export type UpdateEventFixtureTemplateReq = {
  /** CueSketch-only: how bright the fixture looks in the visualiser (%). Must be >= 0. */
  brightnessModifier?: number;
};

export type UpdateEventFixtureTemplateRes = {
  event: LightEvent;
};

/** Edit the event's copy of a fixture template (never the library one). */
export const useUpdateEventFixtureTemplate = (eventId: string) => {
  const queryClient = useQueryClient();
  const realtime = useOptionalRealtime();

  return useMutation({
    // Step 3 save, so the Next button's spinner covers it.
    mutationKey: ["event-config-3"],
    mutationFn: ({ templateId, req }: { templateId: string; req: UpdateEventFixtureTemplateReq }) =>
      api.patch<UpdateEventFixtureTemplateReq, UpdateEventFixtureTemplateRes>(
        `/api/v2/events/${encodeURIComponent(eventId)}/fixture-templates/${encodeURIComponent(templateId)}`,
        req,
      ),
    onSuccess: (res) => {
      // The response is the saved event, so put it straight into the cache.
      queryClient.setQueryData(makeGetEventQueryKey(eventId), res.event);
      // The visualiser reads the event's template copies.
      invalidateVisualiserData(queryClient, eventId);
      // Currently a no-op: EditEvent (the setup pages) has no RealtimeProvider.
      realtime?.sendMessage(ClientMessageType.ClientMessageInvalidateQuery, {
        queryKey: [...makeGetEventQueryKey(eventId)] as string[],
      });
      realtime?.sendMessage(ClientMessageType.ClientMessageInvalidateQuery, {
        queryKey: [...makeGetVisualiserDataQueryKey(eventId)],
      });
    },
  });
};
