import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { UpsertFixtureReq, UpsertFixtureRes } from "../types/fixtures";

export const useUpsertFixture = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fixture: UpsertFixtureReq) => api.put<UpsertFixtureReq, UpsertFixtureRes>("/api/v1/fixtures", fixture),
    onSuccess: (_response, fixture) => {
      // queryClient.invalidateQueries({ queryKey: ["fixtures", fixture.fixtureGroupId] });
      // queryClient.invalidateQueries({ queryKey: ["fixtures", fixture.eventId] });

      // Invalidate all queries that start with "fixtures", followed by a list of fixtureGroupIds
      // For example, if fixtureGroupId for this mutation is abc, it will invalidate any query key that contains ["fixtures", "abc"].
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return queryKey.includes("fixtures") && queryKey.includes(fixture.fixtureGroupId);
        },
      });
    },
  });
};
