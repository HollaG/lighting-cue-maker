import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Item, ItemOverview, UpsertItem } from "../../types-v2/item";
import { makeGetItemQueryKey } from "./useGetItem";
import { itemsUrl, makeGetItemsQueryKey } from "./useGetItems";

// Keep in sync with UpsertItemReqBody in server/internal/models/v2/item.go.
export type UpsertItemReq = {
  item: UpsertItem;
};

export type UpsertItemRes = {
  item: Item;
};

/**
 * Create or update ONE item of an event. There is no bulk upsert: many users edit items at once.
 * No `id` = create (`name` is required). With `id` = update: a field left out keeps its current value,
 * so partial updates like `{ id, rawLyrics }` are fine.
 */
export const useUpsertItem = (eventId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: UpsertItem) => api.post<UpsertItemReq, UpsertItemRes>(itemsUrl(eventId), { item }),

    onSuccess: (res) => {
      // The list holds overviews (no lyrics): replace by id, or append a new item (the list is oldest first).
      const { rawLyrics: _rawLyrics, ...overview } = res.item;
      queryClient.setQueryData<ItemOverview[]>(makeGetItemsQueryKey(eventId), (prev) => {
        if (!prev) return prev;
        return prev.some((i) => i.id === overview.id)
          ? prev.map((i) => (i.id === overview.id ? overview : i))
          : [...prev, overview];
      });
      // Update the single-item cache too. Merge, because the response has no cues and the cached item may.
      queryClient.setQueryData<Item>(makeGetItemQueryKey(eventId, res.item.id), (prev) =>
        prev ? { ...prev, ...res.item } : prev,
      );
      // Only the list is refetched: refetching the single item on every lyrics save would resend the whole text.
      void queryClient.invalidateQueries({ queryKey: makeGetItemsQueryKey(eventId) });
    },
  });
};
