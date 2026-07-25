import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { DeleteCuesRes } from "../types/http";

export type DeleteCueParams = {
  cueId: string;
};

export const useDeleteCue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cueId }: DeleteCueParams) => api.delete<void, DeleteCuesRes>(`/api/v1/cues/${cueId}`),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cues"] });
    },
  });
};
