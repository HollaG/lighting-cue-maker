import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { CreateBumpReq, CreateBumpRes } from "../types/http";

export const useCreateBump = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateBumpReq) => api.post<CreateBumpReq, CreateBumpRes>("/api/v1/bumps", params),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bumps"] });
      queryClient.invalidateQueries({ queryKey: ["item"] });
    },
  });
};
