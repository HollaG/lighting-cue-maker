import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { DeleteCuesRes } from "../../types/http";
import { useRealtime } from "../../context/realtime";
import { ClientMessageType, type ClientMessageInvalidateQueryData } from "../../types/realtime/realtime";
import { makeGetAlternatesQueryKey } from "./useGetAlternates";

export type DeleteAlternateCueParams = {
  alternateId: string;
  cueId: string;
};

export const useDeleteAlternate = () => {
  const queryClient = useQueryClient();
  const { sendMessage } = useRealtime();

  return useMutation({
    mutationFn: ({ alternateId }: DeleteAlternateCueParams) =>
      api.delete<void, DeleteCuesRes>(`/api/v1/alternate-cues/${alternateId}`),

    onSuccess: (_res, variables) => {
      const queryKey = makeGetAlternatesQueryKey(variables.cueId);
      void queryClient.invalidateQueries({ queryKey });
      void sendMessage(ClientMessageType.ClientMessageInvalidateQuery, {
        queryKey,
      } as ClientMessageInvalidateQueryData);
    },
  });
};
