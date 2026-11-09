import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { PatchedFixture, UpsertPatchedFixture } from "../../types-v2/patchedFixture";

export type UpsertPatchedFixturesReq = {
  fixtures: UpsertPatchedFixture[];
};

export type UpsertPatchedFixturesRes = {
  fixtures: PatchedFixture[];
};

export const makeGetPatchedFixturesQueryKey = (eventId: string) => ["v2", "patchedFixtures", eventId] as const;

/**
 * Create or update several patched fixtures in one request.
 *
 * Updates (items with an `id`) are applied to the cached list straight away, so the visualiser doesn't jump back
 * to the old positions while the request is in flight. The cache is rolled back if the request fails.
 */
export const useUpsertPatchedFixtures = (eventId: string) => {
  const queryClient = useQueryClient();
  const queryKey = makeGetPatchedFixturesQueryKey(eventId);

  return useMutation({
    mutationFn: (fixtures: UpsertPatchedFixture[]) =>
      api.post<UpsertPatchedFixturesReq, UpsertPatchedFixturesRes>(
        `/api/v2/events/${encodeURIComponent(eventId)}/patched-fixtures`,
        { fixtures },
      ),

    onMutate: async (fixtures) => {
      // Stop an older refetch from overwriting the optimistic values.
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PatchedFixture[]>(queryKey);

      const updates = new Map(fixtures.filter((f) => f.id).map((f) => [f.id!, f]));
      if (previous && updates.size > 0) {
        queryClient.setQueryData<PatchedFixture[]>(
          queryKey,
          previous.map((f) => (updates.has(f.id) ? { ...f, ...updates.get(f.id) } : f)),
        );
      }
      return { previous };
    },

    onError: (_error, _fixtures, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
};
