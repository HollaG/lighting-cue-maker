import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { UpsertVisualiser, Visualiser } from "../../types-v2/visualiser";
import { makeGetVisualiserQueryKey } from "./useGetVisualiser";

// Keep in sync with UpsertVisualiserBody in server/internal/models/v2/visualiser.go.
export type UpsertVisualiserReq = {
  visualiser: UpsertVisualiser;
};

export type UpsertVisualiserRes = {
  visualiser: Visualiser;
};

/**
 * Create or update the event's visualiser (one per event).
 * Send only the fields that changed, e.g. `{ defaultCameraView }`; the rest keep their saved values.
 */
export const useUpsertVisualiser = (eventId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    // Step 4 (fixture placements) save, so the Next button's spinner covers it.
    mutationKey: ["event-config-4"],
    mutationFn: (visualiser: UpsertVisualiser) =>
      api.post<UpsertVisualiserReq, UpsertVisualiserRes>(`/api/v2/events/${encodeURIComponent(eventId)}/visualiser`, {
        visualiser,
      }),

    onSuccess: (res) => {
      // The response is the saved visualiser, so put it straight into the cache.
      queryClient.setQueryData(makeGetVisualiserQueryKey(eventId), res.visualiser);
    },
  });
};
