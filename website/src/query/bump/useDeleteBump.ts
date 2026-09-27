import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export type DeleteBumpParams = {
  bumpId: string;
};

export type DeleteBumpRes = {
  message: string;
};

export const useDeleteBump = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bumpId }: DeleteBumpParams) => api.delete<void, DeleteBumpRes>(`/api/v1/bumps/${bumpId}`),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bumps"] });
      // queryClient.invalidateQueries({ queryKey: ["item"] });
    },
  });
};
