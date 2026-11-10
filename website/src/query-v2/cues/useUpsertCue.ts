import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Cue, UpsertCue } from "../../types-v2/cue";
import { cuesUrl, makeGetCuesQueryKey } from "./useGetCues";

// Keep in sync with UpsertCueReqBody in server/internal/models/v2/cue.go.
export type UpsertCueReq = {
  cue: UpsertCue;
};

export type UpsertCueRes = {
  cue: Cue;
};

/**
 * Create or update ONE cue of an item. There is no bulk upsert: many users edit cues at once.
 * No `id` = create (every field has a default). With `id` = update: a field left out keeps its current value,
 * so partial updates like `{ id, comments }` are fine. `transition` and `overrides` are replaced as a whole,
 * and `activeFixtureGroupIds` / `selectableIds` are deduplicated by the server.
 */
export const useUpsertCue = (eventId: string, itemId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cue: UpsertCue) => api.post<UpsertCueReq, UpsertCueRes>(cuesUrl(eventId, itemId), { cue }),

    onSuccess: (res) => {
      // The response is the saved row, and the list is oldest first, so replace by id or append.
      // No refetch: saves are frequent (the cue form autosaves) and nothing here depends on server order.
      queryClient.setQueryData<Cue[]>(makeGetCuesQueryKey(eventId, itemId), (prev) => {
        if (!prev) return prev;
        return prev.some((c) => c.id === res.cue.id)
          ? prev.map((c) => (c.id === res.cue.id ? res.cue : c))
          : [...prev, res.cue];
      });
    },
  });
};
