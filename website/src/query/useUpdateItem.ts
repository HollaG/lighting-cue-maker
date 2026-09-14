import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { UpdateItemReq, UpdateItemRes } from "../types/http";
import { sanitize } from "../utils/sanitize";
import { makeGetItemQueryKey } from "./useGetItem";
import { ClientMessageType, type ClientMessageInvalidateQueryData } from "../types/realtime/realtime";
import { useOptionalRealtime } from "../context/realtime";

export type UpdateItemParams = {
  itemId: string;
  requestBody: UpdateItemReq;
};

export const useUpdateItem = () => {
  const queryClient = useQueryClient();
  const realtime = useOptionalRealtime();

  return useMutation({
    mutationFn: ({ itemId, requestBody }: UpdateItemParams) => {
      const body = { ...requestBody };
      if (typeof body.rawLyrics === "string") {
        body.rawLyrics = sanitize(body.rawLyrics);
      }
      return api.patch<UpdateItemReq, UpdateItemRes>(`/api/v1/items/${itemId}`, body);
    },

    onSuccess: (res, variables) => {
      const queryKey = makeGetItemQueryKey(variables.itemId);
      queryClient.setQueryData(queryKey, res.item);
      realtime?.sendMessage(ClientMessageType.ClientMessageInvalidateQuery, {
        queryKey,
      } as ClientMessageInvalidateQueryData);
      // queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
};
