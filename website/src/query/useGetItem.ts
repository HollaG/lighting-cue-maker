import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { generateRich } from "../utils/convertText";
import { getCueOrder } from "../utils/cueUtils";
import type { GetItemRes } from "../types/http";

export const useGetItem = ({ eventId, itemId }: { eventId?: string; itemId?: string }) => {
  const query = useQuery({
    queryKey: ["events", eventId, "items", itemId],
    queryFn: async () => {
      const res = await api.get<GetItemRes>(`/api/v1/events/${eventId}/items/${itemId}`);
      return res.item;
    },
    enabled: !!eventId && !!itemId,
    select: (item) => {
      const lyrics = item?.rawLyrics ?? "";
      return {
        ...item,
        content: generateRich(lyrics),
        cueOrder: getCueOrder(lyrics),
      };
    },
  });

  return {
    item: query.data ?? null,
    cueOrder: query.data?.cueOrder ?? [],
    content: query.data?.content ?? [],
    isItemLoading: query.isLoading,
    isItemError: query.isError,
    refetchItem: query.refetch,
  };
};

export type GetItemRefetchFn = ReturnType<typeof useGetItem>["refetchItem"];
