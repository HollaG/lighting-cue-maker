import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { CreateCueReq, CreateCueRes } from "../types/http";

export type CreateCueParams = {
  itemId: string;
};

export const useCreateCue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateCueReq) => api.post<CreateCueReq, CreateCueRes>("/api/v1/cues", params),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cues"] });
    },
  });
};
