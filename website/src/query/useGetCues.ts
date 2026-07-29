import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { GetCuesRes } from "../types/http";

export type UseGetCuesReturnType = ReturnType<typeof useGetCues>;

export const useGetCues = ({ itemId }: { itemId?: string | null }) => {
  const query = useQuery({
    queryKey: ["cues", itemId],
    queryFn: async () => {
      const res = await api.get<GetCuesRes>(`/api/v1/cues?itemId=${itemId}`);
      return res.cues;
    },
    enabled: !!itemId && itemId.length === 36,
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
