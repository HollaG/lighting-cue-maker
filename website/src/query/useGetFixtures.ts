import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { GetFixturesRes } from "../types/fixtures";

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
