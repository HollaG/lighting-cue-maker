import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { UpdateCueReq, UpdateCueRes } from "../types/http";
import type { Cue } from "../types/cues";
import { ClientMessageType, useWebTransport, type ClientMessageInvalidateQueryData } from "../context/webtransport";
import { makeGetCuesQueryKey } from "./useGetCues";

export type UpdateCueParams = {
  cueId: string;
  itemId: string;
  requestBody: UpdateCueReq;
};

export const useUpdateCue = () => {
  const queryClient = useQueryClient();
  const { sendMessage } = useWebTransport();

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

      // asynchronously send the fact that a cue was updated
      void sendMessage(ClientMessageType.ClientMessageInvalidateQuery, {
        queryKey: makeGetCuesQueryKey(variables.itemId),
      } as ClientMessageInvalidateQueryData);
    },
  });
};
