import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Visualiser } from "../../types-v2/visualiser";

export type GetVisualiserReq = void;

export type GetVisualiserRes = {
  visualiser: Visualiser;
};

export const makeGetVisualiserQueryKey = (eventId: string) => ["v2", "visualiser", eventId] as const;

export const useGetVisualiser = (eventId: string) => {
  const query = useQuery({
    queryKey: makeGetVisualiserQueryKey(eventId),
    queryFn: async () => {
      const res = await api.get<GetVisualiserRes>(`/api/v2/events/${encodeURIComponent(eventId)}/visualiser`);
      return res.visualiser;
    },
    enabled: !!eventId,
  });

  return {
    visualiser: query.data ?? null,
    refetchVisualiser: query.refetch,
    isVisualiserLoading: query.isLoading,
    isVisualiserError: query.isError,
    visualiserError: query.error,
  };
};

export type GetVisualiserRefetchFn = ReturnType<typeof useGetVisualiser>["refetchVisualiser"];
