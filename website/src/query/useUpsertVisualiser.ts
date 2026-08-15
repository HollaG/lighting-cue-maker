import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { UpsertVisualiserReq, UpsertVisualiserRes } from "../types/visualiser";

export const useUpsertVisualiser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (visualiser: UpsertVisualiserReq) =>
      api.put<UpsertVisualiserReq, UpsertVisualiserRes>("/api/v1/visualiser", visualiser),
    onSuccess: ({ visualiser }, { eventId }) => {
      queryClient.setQueryData(["visualiser", eventId], visualiser);
    },
  });
};
