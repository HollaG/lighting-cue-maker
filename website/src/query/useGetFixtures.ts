import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { GetFixturesRes } from "../types/fixtures";
import type { LightEventConfiguration } from "../types/types";

export const useGetFixtures = ({ fixtureGroupId }: { fixtureGroupId?: string | null }) => {
  const query = useQuery({
    queryKey: ["fixtures", fixtureGroupId],
    queryFn: async () => {
      const res = await api.get<GetFixturesRes>(
        `/api/v1/fixtures?fixtureGroupId=${encodeURIComponent(fixtureGroupId!)}`,
      );
      return res.fixtures;
    },
    enabled: !!fixtureGroupId,
  });

  return {
    fixtures: query.data ?? [],
    refetchFixtures: query.refetch,
    isFixturesLoading: query.isLoading,
    isFixturesError: query.isError,
    fixturesError: query.error,
  };
};

export type GetFixturesRefetchFn = ReturnType<typeof useGetFixtures>["refetchFixtures"];

// Unfortunately, we need to get the ENTIRE event, so we know what fixtureGroupIds to query.
// TODO: find a better way
export const useGetFixturesByEventId = ({ event }: { event?: LightEventConfiguration }) => {
  const query = useQuery({
    queryKey: ["fixtures", ...(event?.fixtureGroups.map((fg) => fg.id) || [])],
    queryFn: async () => {
      const res = await api.get<GetFixturesRes>(`/api/v1/fixtures?eventId=${encodeURIComponent(event?.id!)}`);
      return res.fixtures;
    },

    // Gated by event, so safe to do ?, which would normally send invalid query.
    enabled: !!event,
  });

  return {
    fixtures: query.data ?? [],
    refetchFixtures: query.refetch,
    isFixturesLoading: query.isLoading,
    isFixturesError: query.isError,
    fixturesError: query.error,
  };
};

export type GetFixturesByEventIdRefetchFn = ReturnType<typeof useGetFixturesByEventId>["refetchFixtures"];
