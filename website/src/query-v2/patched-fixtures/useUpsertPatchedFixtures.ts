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

/** Create or update several patched fixtures in one request. */
export const useUpsertPatchedFixtures = (eventId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fixtures: UpsertPatchedFixture[]) =>
      api.post<UpsertPatchedFixturesReq, UpsertPatchedFixturesRes>(
        `/api/v2/events/${encodeURIComponent(eventId)}/patched-fixtures`,
        { fixtures },
      ),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: makeGetPatchedFixturesQueryKey(eventId) });
    },
  });
};
