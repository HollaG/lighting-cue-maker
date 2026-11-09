import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { PatchedFixture } from "../../types-v2/patchedFixture";
import { makeGetPatchedFixturesQueryKey } from "./useUpsertPatchedFixtures";

export type GetPatchedFixturesRes = {
  fixtures: PatchedFixture[];
};

/**
 * All patched fixtures of an event. Pass `null` before the event exists; the query then waits.
 * useUpsertPatchedFixtures invalidates this after a save.
 */
export const useGetPatchedFixtures = (eventId: string | null | undefined) => {
  const query = useQuery({
    queryKey: makeGetPatchedFixturesQueryKey(eventId ?? ""),
    queryFn: async () => {
      const res = await api.get<GetPatchedFixturesRes>(
        `/api/v2/events/${encodeURIComponent(eventId!)}/patched-fixtures`,
      );
      return res.fixtures;
    },
    enabled: !!eventId,
  });

  return {
    patchedFixtures: query.data ?? [],
    refetchPatchedFixtures: query.refetch,
    isPatchedFixturesLoading: query.isLoading,
    isPatchedFixturesError: query.isError,
    patchedFixturesError: query.error,
  };
};
