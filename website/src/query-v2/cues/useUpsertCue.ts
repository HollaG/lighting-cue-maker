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
  const queryKey = makeGetCuesQueryKey(eventId, itemId);
  const mutationKey = ["upsertCue", eventId, itemId];

  return useMutation({
    mutationKey,
    scope: { id: `upsertCue-${eventId}-${itemId}` },
    mutationFn: (cue: UpsertCue) => api.post<UpsertCueReq, UpsertCueRes>(cuesUrl(eventId, itemId), { cue }),

    // optimistic
    onMutate: async (patch) => {
      // no optimistic for create
      if (patch.id === undefined) return;

      // Other responses from fetches may be in progress; those data are old and do not have
      // the new data in this patch. Throw them away (might lost some data but it should reconcile)
      await queryClient.cancelQueries({ queryKey });

      // get the past cues
      // and insert our changes
      const existingCues = queryClient.getQueryData<Cue[]>(queryKey);
      const fields = withoutUndefined(patch); // all fields that are not undefined

      queryClient.setQueryData<Cue[]>(queryKey, (prev) => {
        if (!prev) return prev;
        return prev.map((c) => (c.id === patch.id ? { ...c, ...fields } : c));
      });

      return { existingCues }; // return the previous value so we can roll back if needed
    },

    onSuccess: (res) => {
      // make sure we don't overwrite.
      // when a old response comes back AFTER we optimistically update BUT before the new patch (with the optimistic data) lands
      const pendingForThisCue = queryClient.isMutating({
        mutationKey,
        predicate: (m) => (m.state.variables as UpsertCue | undefined)?.id === res.cue.id,
      });
      if (pendingForThisCue > 1) return;

      // The response is the saved row, and the list is oldest first, so replace by id or append.
      // No refetch: saves are frequent (the cue form autosaves) and nothing here depends on server order.
      queryClient.setQueryData<Cue[]>(makeGetCuesQueryKey(eventId, itemId), (prev) => {
        if (!prev) return prev;
        return prev.some((c) => c.id === res.cue.id)
          ? prev.map((c) => (c.id === res.cue.id ? res.cue : c))
          : [...prev, res.cue];
      });
    },

    onError: (err, patch, context) => {
      // rollback
      if (context?.existingCues) {
        queryClient.setQueryData<Cue[]>(queryKey, context.existingCues);
      }
    },
  });
};

/** Copy of `obj` without keys whose value is undefined. */
const withoutUndefined = <T extends object>(obj: T): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
