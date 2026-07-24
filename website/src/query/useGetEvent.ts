import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { GetEventRes } from "../types/http";

export const useGetEvent = ({ code }: { code: string }) => {
  const query = useQuery({
    queryKey: ["events", code],
    queryFn: async () => {
      const res = await api.get<GetEventRes>(`/api/v1/events/${code}`);
      return res.event;
    },
    enabled: !!code && code.length === 36,
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
  };
};
