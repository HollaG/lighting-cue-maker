import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { GetAlternateCuesRes } from "../../types/alternate-cue";

export type UseGetAlternatesReturnType = ReturnType<typeof useGetAlternates>;

export const makeGetAlternatesQueryKey = (cueId: string | null | undefined) => ["alternate-cues", "cue", cueId];

export const useGetAlternates = ({ cueId }: { cueId?: string | null }) => {
  const query = useQuery({
    queryKey: makeGetAlternatesQueryKey(cueId),
    queryFn: async () => {
      const res = await api.get<GetAlternateCuesRes>(`/api/v1/alternate-cues?cueId=${cueId}`);
      return res.alternateCues;
    },
    enabled: !!cueId && cueId.length === 36,
    staleTime: 60_000,
  });

  return {
    alternates: query.data,
    refetchAlternates: query.refetch,
    isAlternatesLoading: query.isLoading,
    isAlternatesError: query.isError,
    alternatesError: query.error,
  };
};

export type GetAlternatesRefetchFn = ReturnType<typeof useGetAlternates>["refetchAlternates"];
