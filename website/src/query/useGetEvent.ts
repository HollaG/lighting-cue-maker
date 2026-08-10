import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { GetEventRes } from "../types/http";

export const useGetEvent = ({ eventId }: { eventId: string }) => {
  const query = useQuery({
    queryKey: ["events", eventId],
    queryFn: async () => {
      const res = await api.get<GetEventRes>(`/api/v1/events/${eventId}`);
      return res.event;
    },
    enabled: !!eventId,
  });

  const event = query.data ?? null;
  const isValidEvent = !!event;

  return {
    event,
    isValidEvent,
    isError: query.isError,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    fetcher: query.refetch,
  };
};
