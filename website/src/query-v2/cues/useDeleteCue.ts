import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Cue } from "../../types-v2/cue";
import { cuesUrl, makeGetCuesQueryKey } from "./useGetCues";

/**
 * Soft-deletes one cue. Restoring it brings it back.
 * Removing its marker from `Item.rawLyrics` is a separate item update: this only deletes the cue row.
 */
export const useDeleteCue = (eventId: string, itemId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cueId: string) =>
      api.delete<undefined, { deleted: boolean }>(`${cuesUrl(eventId, itemId)}/${encodeURIComponent(cueId)}`),

    onSuccess: (_res, cueId) => {
      // Drop it from the cached list straight away, then refetch in the background.
      queryClient.setQueryData<Cue[]>(makeGetCuesQueryKey(eventId, itemId), (prev) =>
        prev?.filter((c) => c.id !== cueId),
      );
      void queryClient.invalidateQueries({ queryKey: makeGetCuesQueryKey(eventId, itemId) });
    },
  });
};
