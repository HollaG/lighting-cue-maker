import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { UpdateCueReq, UpdateCueRes } from "../types/http";
import type { Cue } from "../types/cues";

export type UpdateCueParams = {
  cueId: string;
  itemId: string;
  requestBody: UpdateCueReq;
};

export const useUpdateCue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cueId, requestBody }: UpdateCueParams) =>
      api.patch<UpdateCueReq, UpdateCueRes>(`/api/v1/cues/${cueId}`, requestBody),

    onSuccess: (res, variables) => {
      const newCue = res.cue;
      const oldCues = queryClient.getQueryData<Cue[]>(["cues", variables.itemId]);
      if (oldCues) {
        const replacedCues = oldCues.map((cue) => (cue.id === newCue.id ? newCue : cue));
        queryClient.setQueryData(["cues", variables.itemId], replacedCues);
      }

      // No need to update Item
    },
  });
};
