import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { FixtureGroup } from "../../types-v2/fixtureGroups";

export type GetFixtureGroupsRes = {
  fixtureGroups: FixtureGroup[];
};

export const makeGetFixtureGroupsQueryKey = (eventId: string) => ["v2", "fixtureGroups", eventId] as const;

/**
 * All fixture groups of an event. Pass `null` before the event exists; the query then waits.
 * useUpsertFixtureGroups updates this after a save.
 */
export const useGetFixtureGroups = (eventId: string | null | undefined) => {
  const query = useQuery({
    queryKey: makeGetFixtureGroupsQueryKey(eventId ?? ""),
    queryFn: async () => {
      const res = await api.get<GetFixtureGroupsRes>(`/api/v2/events/${encodeURIComponent(eventId!)}/fixture-groups`);
      return res.fixtureGroups;
    },
    enabled: !!eventId,
  });

  return {
    fixtureGroups: query.data ?? [],
    refetchFixtureGroups: query.refetch,
    isFixtureGroupsLoading: query.isLoading,
    isFixtureGroupsError: query.isError,
    fixtureGroupsError: query.error,
  };
};
