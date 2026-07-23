import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { GetCuesRes } from "../types/http";

export const useGetCues = ({ eventId, itemId }: { eventId: string; itemId: string }) => {
  const query = useQuery({
    queryKey: ["events", eventId, "items", itemId, "cues"],
    queryFn: async () => {
      const res = await api.get<GetCuesRes>(`/api/v1/events/${eventId}/items/${itemId}/cues`);
      return res.cues;
    },
    enabled: !!eventId && eventId.length === 36 && !!itemId && itemId.length === 36,
  });
  return {
    cues: query.data,
    refetchCues: query.refetch,
    isCuesLoading: query.isLoading,
    isCuesError: query.isError,
    cuesError: query.error,
  };
};

export type GetCuesRefetchFn = ReturnType<typeof useGetCues>["refetchCues"];
