import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRealtime } from "../../context/realtime";
import { api } from "../../lib/api";
import type { AlternateCue, UpdateAlternateCueReq, UpdateAlternateCueRes } from "../../types/alternate-cue";
import { ClientMessageType, type ClientMessageInvalidateQueryData } from "../../types/realtime/realtime";
import { makeGetAlternatesQueryKey } from "./useGetAlternates";

export type UpdateAlternateParams = {
  alternateId: string;
  requestBody: UpdateAlternateCueReq;
};

// not to be used outside of EventPage
export const useUpdateAlternate = () => {
  const queryClient = useQueryClient();
  const realtime = useRealtime();

  return useMutation({
    mutationFn: ({ requestBody, alternateId }: UpdateAlternateParams) =>
      api.put<UpdateAlternateCueReq, UpdateAlternateCueRes>(`/api/v1/alternate-cues/${alternateId}`, requestBody),

    onSuccess: (res) => {
      const queryKey = makeGetAlternatesQueryKey(res.alternateCue.cueId);
      const alternates = queryClient.getQueryData<AlternateCue[]>(queryKey);
      if (alternates) {
        queryClient.setQueryData(
          queryKey,
          alternates.map((alternate) => (alternate.id === res.alternateCue.id ? res.alternateCue : alternate)),
        );
      }

      realtime.sendMessage(ClientMessageType.ClientMessageInvalidateQuery, {
        queryKey,
      } as ClientMessageInvalidateQueryData);
    },
  });
};
