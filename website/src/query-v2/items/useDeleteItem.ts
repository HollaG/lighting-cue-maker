import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { ItemOverview } from "../../types-v2/item";
import { makeGetItemQueryKey } from "./useGetItem";
import { itemsUrl, makeGetItemsQueryKey } from "./useGetItems";

/**
 * Soft-deletes one item. Its cues stay, so restoring it brings them back
 * (see "Safe setup edits" in the implementation notes).
 */
export const useDeleteItem = (eventId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) =>
      api.delete<undefined, { deleted: boolean }>(`${itemsUrl(eventId)}/${encodeURIComponent(itemId)}`),

    onSuccess: (_res, itemId) => {
      // Drop it from the cached list straight away, then refetch in the background.
      queryClient.setQueryData<ItemOverview[]>(makeGetItemsQueryKey(eventId), (prev) =>
        prev?.filter((i) => i.id !== itemId),
      );
      queryClient.removeQueries({ queryKey: makeGetItemQueryKey(eventId, itemId) });
      void queryClient.invalidateQueries({ queryKey: makeGetItemsQueryKey(eventId) });
    },
  });
};
