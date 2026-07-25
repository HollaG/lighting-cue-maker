import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { UpdateItemReq, UpdateItemRes } from "../types/http";
import { sanitize } from "../utils/sanitize";

export type UpdateItemParams = {
  itemId: string;
  requestBody: UpdateItemReq;
};

export const useUpdateItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, requestBody }: UpdateItemParams) => {
      const body = { ...requestBody };
      if (typeof body.rawLyrics === "string") {
        body.rawLyrics = sanitize(body.rawLyrics);
      }
      return api.patch<UpdateItemReq, UpdateItemRes>(`/api/v1/items/${itemId}`, body);
    },

    onSuccess: (res, variables) => {
      queryClient.setQueryData(["item", variables.itemId], res.item);
      // queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
};
