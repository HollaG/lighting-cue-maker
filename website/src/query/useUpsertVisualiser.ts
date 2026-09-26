import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { UpsertVisualiserReq, UpsertVisualiserRes } from "../types/visualiser";
import { useAppStore } from "../store/appStore";

export const useUpsertVisualiser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (visualiser: UpsertVisualiserReq) =>
      api.put<UpsertVisualiserReq, UpsertVisualiserRes>("/api/v1/visualiser", visualiser),
    onSuccess: ({ visualiser, previous }, { eventId }) => {
      queryClient.setQueryData(["visualiser", eventId], visualiser);

      // update the store with the previous state
      const objects3D = previous.objects3D;
      useAppStore.getState().add3DObjectHistory(objects3D);
    },
  });
};
