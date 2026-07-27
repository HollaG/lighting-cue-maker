import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAppStore } from "../store/appStore";
import type { UpdateFixtureGroupConfigReq } from "../types/http";

type UpdateFixtureGroupConfigRes = {
  fixtureGroup: import("../types/types").FixtureGroupConfiguration;
};

export const useUpdateFixtureGroupConfig = () => {
  const code = useAppStore((s) => s.code);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fixtureGroupId,
      requestBody,
    }: {
      fixtureGroupId: string;
      requestBody: UpdateFixtureGroupConfigReq;
    }) =>
      api.patch<UpdateFixtureGroupConfigReq, UpdateFixtureGroupConfigRes>(
        `/api/v1/fixture-group-config/${fixtureGroupId}`,
        requestBody,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", code] });
    },
  });
};
