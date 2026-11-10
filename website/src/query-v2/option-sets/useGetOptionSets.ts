import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { OptionSet } from "../../types-v2/optionSet";

export type GetOptionSetsRes = {
  optionSets: OptionSet[];
};

/** Prefix shared by every option set query of a fixture group (the list and each single set). */
export const makeOptionSetsQueryKeyPrefix = (eventId: string, fixtureGroupId: string) =>
  ["v2", "optionSets", eventId, fixtureGroupId] as const;

export const makeGetOptionSetsQueryKey = (eventId: string, fixtureGroupId: string) =>
  [...makeOptionSetsQueryKeyPrefix(eventId, fixtureGroupId), "list"] as const;

export const optionSetsUrl = (eventId: string, fixtureGroupId: string) =>
  `/api/v2/events/${encodeURIComponent(eventId)}/fixture-groups/${encodeURIComponent(fixtureGroupId)}/option-sets`;

/**
 * All option sets of one fixture group, ordered by sortOrder (then creation).
 * Pass `null` for either id to wait (e.g. before a group is selected).
 */
export const useGetOptionSets = (eventId: string | null | undefined, fixtureGroupId: string | null | undefined) => {
  const query = useQuery({
    queryKey: makeGetOptionSetsQueryKey(eventId ?? "", fixtureGroupId ?? ""),
    queryFn: async () => {
      const res = await api.get<GetOptionSetsRes>(optionSetsUrl(eventId!, fixtureGroupId!));
      return res.optionSets;
    },
    enabled: !!eventId && !!fixtureGroupId,
  });

  return {
    optionSets: query.data ?? [],
    refetchOptionSets: query.refetch,
    isOptionSetsLoading: query.isLoading,
    isOptionSetsError: query.isError,
    optionSetsError: query.error,
  };
};
