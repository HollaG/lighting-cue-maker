import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { GetItemsRes } from "../types/http";

export const useGetItems = ({ eventId }: { eventId: string }) => {
  const query = useQuery({
    queryKey: ["items", eventId],
    queryFn: async () => {
      const res = await api.get<GetItemsRes>(`/api/v1/items?eventId=${eventId}`);
      return res.items;
    },
    enabled: !!eventId && eventId.length === 36,
  });
  return {
    items: query.data ?? [],
    isItemsLoading: query.isLoading,
    isItemsError: query.isError,
    refetchItems: query.refetch,
  };
};

export type GetItemsRefetchFn = ReturnType<typeof useGetItems>["refetchItems"];
