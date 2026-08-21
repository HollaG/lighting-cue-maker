import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { CreateBumpConfigurationReq, CreateBumpConfigurationRes } from "../types/http";
import type { LightEventConfiguration } from "../types/types";

export const useCreateBumpConfiguration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateBumpConfigurationReq) =>
      api.post<CreateBumpConfigurationReq, CreateBumpConfigurationRes>("/api/v1/bump-configurations", params),
    onSuccess: ({ bumpConfiguration }, { eventId }) => {
      queryClient.setQueryData<LightEventConfiguration>(["events", eventId], (event) =>
        event
          ? {
              ...event,
              bumpConfigurations: [...event.bumpConfigurations, bumpConfiguration],
            }
          : event,
      );
    },
  });
};
