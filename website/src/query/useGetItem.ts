import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { GetItemRes } from "../types/http";

export const useGetItem = ({ itemId }: { itemId?: string | null }) => {
  const query = useQuery({
    queryKey: ["item", itemId],
    queryFn: async () => {
      const res = await api.get<GetItemRes>(`/api/v1/items/${itemId}`);

      return res.item;
    },
    enabled: !!itemId,

    // select: (item) => {
    //   item.rawLyrics = sanitize(item.rawLyrics);

    //   return item;
    // },
  });

  return {
    item: query.data ?? null,
    isItemLoading: query.isLoading,
    isItemError: query.isError,
    refetchItem: query.refetch,
  };
};

export type GetItemRefetchFn = ReturnType<typeof useGetItem>["refetchItem"];
