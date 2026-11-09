import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { FixtureGroup, UpsertFixtureGroup } from "../../types-v2/fixtureGroups";
import { makeGetFixtureGroupsQueryKey } from "./useGetFixtureGroups";

// Keep in sync with the fixture-groups request in server/internal/api/v2.
export type UpsertFixtureGroupsReq = {
  fixtureGroups: UpsertFixtureGroup[];
};

export type UpsertFixtureGroupsRes = {
  fixtureGroups: FixtureGroup[];
};

/**
 * Create or update several fixture groups in one request.
 * A row without `id` is created, a row with `id` is updated. Rows not sent are left alone.
 */
export const useUpsertFixtureGroups = (eventId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    // Step 3 (fixture groups) save, so the Next button's spinner covers it.
    mutationKey: ["event-config-3"],
    mutationFn: (fixtureGroups: UpsertFixtureGroup[]) =>
      api.post<UpsertFixtureGroupsReq, UpsertFixtureGroupsRes>(
        `/api/v2/events/${encodeURIComponent(eventId)}/fixture-groups`,
        { fixtureGroups },
      ),

    onSuccess: (res) => {
      // Merge the saved groups into the cached list straight away (replace by id, append new ones),
      // so the UI updates without waiting for a refetch.
      queryClient.setQueryData<FixtureGroup[]>(makeGetFixtureGroupsQueryKey(eventId), (prev) => {
        if (!prev) return prev;
        const saved = new Map(res.fixtureGroups.map((g) => [g.id, g]));
        const updated = prev.map((g) => saved.get(g.id) ?? g);
        const added = res.fixtureGroups.filter((g) => !prev.some((p) => p.id === g.id));
        return [...updated, ...added];
      });
      // Then refetch to pick up anything the server changed (e.g. sort order).
      void queryClient.invalidateQueries({ queryKey: makeGetFixtureGroupsQueryKey(eventId) });
    },
  });
};
