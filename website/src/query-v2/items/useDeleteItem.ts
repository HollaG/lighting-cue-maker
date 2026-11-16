import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { ItemOverview } from "../../types-v2/item";
import { makeGetItemQueryKey } from "./useGetItem";
import { itemsUrl, makeGetItemsQueryKey, makeItemsQueryKeyPrefix } from "./useGetItems";
import { useOptionalRealtime } from "../../context/realtime";
import { ClientMessageType } from "../../types/realtime/realtime";

/**
 * Soft-deletes one item. Its cues stay, so restoring it brings them back
 * (see "Safe setup edits" in the implementation notes).
 */
export const useDeleteItem = (eventId: string) => {
  const queryClient = useQueryClient();
  const realtime = useOptionalRealtime();

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
      // Tell the others in the event (realtime) to refetch.
      realtime?.sendMessage(ClientMessageType.ClientMessageInvalidateQuery, {
        queryKey: [...makeItemsQueryKeyPrefix(eventId)],
      });
    },
  });
};
