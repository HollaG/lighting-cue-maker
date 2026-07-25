import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Bumps } from "../types/bumps";

export type UpdateBumpParams = {
  bumpId: string;
  requestBody: {
    assignments?: Record<string, any>;
    comments?: string;
  };
};

export type UpdateBumpRes = {
  bump: Bumps;
};

export const useUpdateBump = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bumpId, requestBody }: UpdateBumpParams) =>
      api.patch<UpdateBumpParams["requestBody"], UpdateBumpRes>(`/api/v1/bumps/${bumpId}`, requestBody),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bumps"] });
    },
  });
};
