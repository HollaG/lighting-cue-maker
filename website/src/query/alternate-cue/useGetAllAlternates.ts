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

      // the return result is a list of [cue1, alternate1], [cue2, alternate2], etc
      // group by cueId and set the query data for all useGetAlternates so we don't fire 50 queries at once for all cues
      const alternatesByCue = new Map<string, AlternateCue[]>();
      for (const alternate of res.alternateCues) {
        const alternates = alternatesByCue.get(alternate.cueId) ?? [];
        alternates.push(alternate);
        alternatesByCue.set(alternate.cueId, alternates);
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
        const alternates = alternatesByCue.get(alternate.cueId) ?? [];
        alternates.push(alternate);
        alternatesByCue.set(alternate.cueId, alternates);
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
