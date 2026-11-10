import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Item } from "../../types-v2/item";
import { itemsUrl, makeItemsQueryKeyPrefix } from "./useGetItems";

export type GetItemRes = {
  item: Item;
};

export const makeGetItemQueryKey = (eventId: string, itemId: string) =>
  [...makeItemsQueryKeyPrefix(eventId), "detail", itemId] as const;

/**
 * One item with its lyrics. Pass `null` for either id to wait.
 * The server also sends the item's cues; they are not typed here yet (no v2 Cue type in types-v2).
 */
export const useGetItem = (eventId: string | null | undefined, itemId: string | null | undefined) => {
  const query = useQuery({
    queryKey: makeGetItemQueryKey(eventId ?? "", itemId ?? ""),
    queryFn: async () => {
      const res = await api.get<GetItemRes>(`${itemsUrl(eventId!)}/${encodeURIComponent(itemId!)}`);
      return res.item;
    },
    enabled: !!eventId && !!itemId,
  });

  return {
    item: query.data ?? null,
    refetchItem: query.refetch,
    isItemLoading: query.isLoading,
    isItemError: query.isError,
    itemError: query.error,
  };
};
