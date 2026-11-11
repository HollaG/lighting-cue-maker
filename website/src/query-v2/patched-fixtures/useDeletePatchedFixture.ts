import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { PatchedFixture } from "../../types-v2/patchedFixture";
import type { FixtureGroup } from "../../types-v2/fixtureGroups";
import { makeGetPatchedFixturesQueryKey } from "./useUpsertPatchedFixtures";
import { makeGetFixtureGroupsQueryKey } from "../fixture-groups/useGetFixtureGroups";
import { invalidateVisualiserData } from "../visualiser-data/useGetVisualiserData";

/**
 * Soft-deletes one patched fixture.
 *
 * The backend also removes the fixture from every fixture group, so both the fixture list (useGetPatchedFixtures) and
 * the group list (useGetFixtureGroups) are updated here.
 */
export const useDeletePatchedFixture = (eventId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fixtureId: string) =>
      api.delete<undefined, unknown>(
        `/api/v2/events/${encodeURIComponent(eventId)}/patched-fixtures/${encodeURIComponent(fixtureId)}`,
      ),

    onSuccess: (_res, fixtureId) => {
      const fixturesKey = makeGetPatchedFixturesQueryKey(eventId);
      const groupsKey = makeGetFixtureGroupsQueryKey(eventId);

      // Update the caches straight away, the same way the backend did, then refetch both in the background.
      queryClient.setQueryData<PatchedFixture[]>(fixturesKey, (prev) => prev?.filter((f) => f.id !== fixtureId));
      queryClient.setQueryData<FixtureGroup[]>(groupsKey, (prev) =>
        prev?.map((group) =>
          group.fixtureIds.includes(fixtureId)
            ? {
                ...group,
                fixtureIds: group.fixtureIds.filter((id) => id !== fixtureId),
                // Rule from the notes: removing a fixture also removes all its grid cells.
                grid: group.grid
                  ? { ...group.grid, cells: group.grid.cells.filter((cell) => cell.fixtureId !== fixtureId) }
                  : group.grid,
              }
            : group,
        ),
      );

      void queryClient.invalidateQueries({ queryKey: fixturesKey });
      void queryClient.invalidateQueries({ queryKey: groupsKey });
      invalidateVisualiserData(queryClient, eventId);
    },
  });
};
