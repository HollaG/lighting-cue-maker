import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { GetCuesRes, UpdateCueReq, UpdateCueRes } from "../types/http";

export type UpdateCueParams = {
  cueId: string;
  itemId: string;
  requestBody: UpdateCueReq;
};

export const useUpdateCue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cueId, itemId, requestBody }: UpdateCueParams) =>
      api.patch<UpdateCueReq, UpdateCueRes>(`/api/v1/cues/${cueId}`, requestBody),

    onSuccess: (res, variables) => {
      const newCue = res.cue;
      const oldCues = queryClient.getQueryData<GetCuesRes>(["cues", variables.itemId]);
      const replacedCues = oldCues.cues.map((cue) => (cue.id === newCue.id ? newCue : cue));
      queryClient.setQueryData(["cues", variables.itemId], replacedCues);

      // No need to update Item
    },
  });
};
