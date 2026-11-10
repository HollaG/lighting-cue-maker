import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { ItemOverview } from "../../types-v2/item";

export type GetItemsRes = {
  items: ItemOverview[];
};

/** Prefix shared by every item query of an event (the list, and later each single item). */
export const makeItemsQueryKeyPrefix = (eventId: string) => ["v2", "items", eventId] as const;

export const makeGetItemsQueryKey = (eventId: string) => [...makeItemsQueryKeyPrefix(eventId), "list"] as const;

export const itemsUrl = (eventId: string) => `/api/v2/events/${encodeURIComponent(eventId)}/items`;

/**
 * All items of an event, without lyrics or cues. There is no order field yet, so they come back oldest first.
 * Pass `null` for the id to wait.
 */
export const useGetItems = (eventId: string | null | undefined) => {
  const query = useQuery({
    queryKey: makeGetItemsQueryKey(eventId ?? ""),
    queryFn: async () => {
      const res = await api.get<GetItemsRes>(itemsUrl(eventId!));
      return res.items;
    },
    enabled: !!eventId,
  });

  return {
    items: query.data ?? [],
    refetchItems: query.refetch,
    isItemsLoading: query.isLoading,
    isItemsError: query.isError,
    itemsError: query.error,
  };
};
