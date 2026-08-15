import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { DeleteFixtureRes } from "../types/fixtures";

export type DeleteFixtureParams = {
  fixtureId: string;
  fixtureGroupId: string;
};

export const useDeleteFixture = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fixtureId }: DeleteFixtureParams) =>
      api.delete<void, DeleteFixtureRes>(`/api/v1/fixtures/${fixtureId}`),
    onSuccess: (_response, { fixtureGroupId }) => {
      queryClient.invalidateQueries({ queryKey: ["fixtures", fixtureGroupId] });
    },
  });
};
