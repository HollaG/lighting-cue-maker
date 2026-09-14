import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { CreateCueReq, CreateCueRes } from "../types/http";
import { makeGetCuesQueryKey } from "./useGetCues";
import { ClientMessageType, type ClientMessageInvalidateQueryData } from "../types/realtime/realtime";
import { useOptionalRealtime } from "../context/realtime";

export const useCreateCue = () => {
  const queryClient = useQueryClient();
  const realtime = useOptionalRealtime();

  return useMutation({
    mutationFn: (params: CreateCueReq) => api.post<CreateCueReq, CreateCueRes>("/api/v1/cues", params),

    onSuccess: (_res, variables) => {
      const queryKey = makeGetCuesQueryKey(variables.itemId);
      void queryClient.invalidateQueries({ queryKey });
      realtime?.sendMessage(ClientMessageType.ClientMessageInvalidateQuery, {
        queryKey,
      } as ClientMessageInvalidateQueryData);
    },
  });
};
