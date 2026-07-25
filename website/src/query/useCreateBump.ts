import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Bumps } from "../types/bumps";

export type CreateBumpParams = {
  itemId: string;
  bumpId?: string;
};

export type CreateBumpRes = {
  bump: Bumps;
};

export const useCreateBump = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateBumpParams) =>
      api.post<CreateBumpParams, CreateBumpRes>("/api/v1/bumps", params),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bumps"] });
      queryClient.invalidateQueries({ queryKey: ["item"] });
    },
  });
};
