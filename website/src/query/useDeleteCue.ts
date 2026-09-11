import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { DeleteCuesRes } from "../types/http";
import { makeGetCuesQueryKey } from "./useGetCues";
import { useRealtime } from "../context/realtime";
import { ClientMessageType, type ClientMessageInvalidateQueryData } from "../types/realtime";

export type DeleteCueParams = {
  cueId: string;
  itemId: string;
};

export const useDeleteCue = () => {
  const queryClient = useQueryClient();
  const { sendMessage } = useRealtime();

  return useMutation({
    mutationFn: ({ cueId }: DeleteCueParams) => api.delete<void, DeleteCuesRes>(`/api/v1/cues/${cueId}`),

    onSuccess: (_res, variables) => {
      const queryKey = makeGetCuesQueryKey(variables.itemId);
      void queryClient.invalidateQueries({ queryKey });
      void sendMessage(ClientMessageType.ClientMessageInvalidateQuery, {
        queryKey,
      } as ClientMessageInvalidateQueryData);
    },
  });
};
