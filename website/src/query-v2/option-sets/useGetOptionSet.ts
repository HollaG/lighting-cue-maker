import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { OptionSet } from "../../types-v2/optionSet";
import { makeOptionSetsQueryKeyPrefix, optionSetsUrl } from "./useGetOptionSets";

export type GetOptionSetRes = {
  optionSet: OptionSet;
};

export const makeGetOptionSetQueryKey = (eventId: string, fixtureGroupId: string, optionSetId: string) =>
  [...makeOptionSetsQueryKeyPrefix(eventId, fixtureGroupId), optionSetId] as const;

/** One option set. Pass `null` for any id to wait. */
export const useGetOptionSet = (
  eventId: string | null | undefined,
  fixtureGroupId: string | null | undefined,
  optionSetId: string | null | undefined,
) => {
  const query = useQuery({
    queryKey: makeGetOptionSetQueryKey(eventId ?? "", fixtureGroupId ?? "", optionSetId ?? ""),
    queryFn: async () => {
      const res = await api.get<GetOptionSetRes>(
        `${optionSetsUrl(eventId!, fixtureGroupId!)}/${encodeURIComponent(optionSetId!)}`,
      );
      return res.optionSet;
    },
    enabled: !!eventId && !!fixtureGroupId && !!optionSetId,
  });

  return {
    optionSet: query.data ?? null,
    refetchOptionSet: query.refetch,
    isOptionSetLoading: query.isLoading,
    isOptionSetError: query.isError,
    optionSetError: query.error,
  };
};
