import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Fixture, UpsertFixtureReq, UpsertFixtureRes } from "../types/fixtures";
import { useAppStore } from "../store/appStore";

export const useUpsertFixture = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fixture: UpsertFixtureReq) => api.put<UpsertFixtureReq, UpsertFixtureRes>("/api/v1/fixtures", fixture),

    onSuccess: (response, fixture) => {
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

      const previous = response.previous as Partial<Fixture>;

      // strip the time fields
      delete previous.createdAt;
      delete previous.updatedAt;
      delete previous.deletedAt;

      // save to history
      useAppStore.getState().addFixtureUpdateHistory(previous);
    },
  });
};
