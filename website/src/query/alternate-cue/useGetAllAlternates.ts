import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { AlternateCue, GetAlternateCuesRes } from "../../types/alternate-cue";
import { makeGetAlternatesQueryKey } from "./useGetAlternates";

export type UseGetAllAlternatesReturnType = ReturnType<typeof useGetAllAlternates>;

export const makeGetAllAlternatesQueryKey = (itemId: string | null | undefined) => ["alternate-cues", "item", itemId];

/**
 * Get all alternates for an item ID.
 * Note: this should only be called once upon init.
 *
 * @param param0
 * @returns
 */
export const useGetAllAlternates = ({ itemId }: { itemId?: string | null }) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: makeGetAllAlternatesQueryKey(itemId),
    queryFn: async () => {
      const res = await api.get<GetAlternateCuesRes>(`/api/v1/alternate-cues?itemId=${itemId}`);

      // Group by parent cue ID and seed each cue's alternate query.
      const alternatesByCue = new Map<string, AlternateCue[]>();
      for (const alternate of res.alternateCues) {
        const alternates = alternatesByCue.get(alternate.id) ?? [];
        alternates.push(alternate);
        alternatesByCue.set(alternate.id, alternates);
      }

      for (const [cueId, alternates] of alternatesByCue) {
        queryClient.setQueryData(makeGetAlternatesQueryKey(cueId), alternates);
      }

      return res.alternateCues;
    },
    enabled: !!itemId && itemId.length === 36,
    staleTime: 60_000,

    select: (data) => {
      const alternatesByCue = new Map<string, AlternateCue[]>();
      for (const alternate of data) {
        const alternates = alternatesByCue.get(alternate.id) ?? [];
        alternates.push(alternate);
        alternatesByCue.set(alternate.id, alternates);
      }

      return alternatesByCue;
    },
  });

  return {
    allAlternates: query.data,
    refetchAllAlternates: query.refetch,
    isAllAlternatesLoading: query.isLoading,
    isAllAlternatesError: query.isError,
    allAlternatesError: query.error,
  };
};

export type GetAllAlternatesRefetchFn = ReturnType<typeof useGetAllAlternates>["refetchAllAlternates"];
