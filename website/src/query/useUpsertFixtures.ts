import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { UpsertFixtureReq, UpsertFixtureRes } from "../types/fixtures";

export const useUpsertFixture = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fixture: UpsertFixtureReq) => api.put<UpsertFixtureReq, UpsertFixtureRes>("/api/v1/fixtures", fixture),
    onSuccess: (_response, fixture) => {
      queryClient.invalidateQueries({ queryKey: ["fixtures", fixture.fixtureGroupId] });
    },
  });
};
