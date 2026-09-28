import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AiCreateVersionReq, AiCreateVersionRes } from "../../types/ai";
import { api } from "../../lib/api";

export const useCreateAlternateAi = () => {
  // const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: AiCreateVersionReq) =>
      api.post<AiCreateVersionReq, AiCreateVersionRes>("/api/v1/ai/generate-cue", params),

    onSuccess: (_res, variables) => {
      // TODO
      console.log({ _res, variables });
    },
  });
};
