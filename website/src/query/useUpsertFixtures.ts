import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Fixture, UpsertFixtureReq, UpsertFixtureRes } from "../types/fixtures";
import { useAppStore } from "../store/appStore";

export const useUpsertFixture = ({ recordHistory = true }: { recordHistory?: boolean } = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fixture: UpsertFixtureReq) => api.put<UpsertFixtureReq, UpsertFixtureRes>("/api/v1/fixtures", fixture),

    onSuccess: (response) => {
      // queryClient.invalidateQueries({ queryKey: ["fixtures", fixture.fixtureGroupId] });
      // queryClient.invalidateQueries({ queryKey: ["fixtures", fixture.eventId] });

      // Invalidate all queries that start with "fixtures", followed by a list of fixtureGroupIds
      // For example, if fixtureGroupId for this mutation is abc, it will invalidate any query key that contains ["fixtures", "abc"].
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return queryKey.includes("fixtures") && queryKey.includes(response.fixture.fixtureGroupId);
        },
      });

      // Creation has no previous fixture; undo/redo requests must not become new edits.
      if (!recordHistory || !response.previous?.id) return;

      const before = getFixtureUpdate(response.previous);
      const after = getFixtureUpdate(response.fixture);
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        useAppStore.getState().addFixtureUpdateHistory(before, after);
      }
    },
  });
};

/** Copy editable fields without mutating the API response or retaining timestamps. */
function getFixtureUpdate(fixture: Fixture): UpsertFixtureReq {
  const { createdAt: _createdAt, updatedAt: _updatedAt, deletedAt: _deletedAt, ...update } = fixture;
  return update;
}
