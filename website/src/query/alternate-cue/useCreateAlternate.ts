import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptionalRealtime } from "../../context/realtime";
import { api } from "../../lib/api";
import type { CreateAlternateCueReq, CreateAlternateCueRes } from "../../types/alternate-cue";
import { ClientMessageType, type ClientMessageInvalidateQueryData } from "../../types/realtime/realtime";

export const useCreateAlternate = () => {
  const queryClient = useQueryClient();
  const realtime = useOptionalRealtime();

  return useMutation({
    mutationFn: (params: CreateAlternateCueReq) =>
      api.post<CreateAlternateCueReq, CreateAlternateCueRes>("/api/v1/alternate-cues", params),

    onSuccess: (_data, params) => {
      // refresh the list of cues for this item
      const queryKey = ["alternate-cues", "cue", params.cueId];
      void queryClient.invalidateQueries({ queryKey });
      realtime?.sendMessage(ClientMessageType.ClientMessageInvalidateQuery, {
        queryKey,
      } as ClientMessageInvalidateQueryData);
    },
  });
};
