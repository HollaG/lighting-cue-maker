import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { GetOrCreateVisualiserRes } from "../types/visualiser";

export const useGetOrCreateVisualiser = ({ eventId }: { eventId?: string | null }) => {
  const query = useQuery({
    queryKey: ["visualiser", eventId],
    queryFn: async () => {
      const res = await api.put<void, GetOrCreateVisualiserRes>(
        `/api/v1/visualiser/${encodeURIComponent(eventId!)}`,
      );
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

export type GetOrCreateVisualiserRefetchFn = ReturnType<
  typeof useGetOrCreateVisualiser
>["refetchVisualiser"];
