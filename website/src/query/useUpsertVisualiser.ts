import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { UpsertVisualiserReq, UpsertVisualiserRes } from "../types/visualiser";
import { useAppStore } from "../store/appStore";

export const useUpsertVisualiser = ({ recordHistory = true }: { recordHistory?: boolean } = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (visualiser: UpsertVisualiserReq) =>
      api.put<UpsertVisualiserReq, UpsertVisualiserRes>("/api/v1/visualiser", visualiser),
    onSuccess: ({ visualiser, previous }, { eventId, objects3D }) => {
      queryClient.setQueryData(["visualiser", eventId], visualiser);

      // Camera/environment saves do not change the object history.
      if (!recordHistory || objects3D === undefined || !previous) return;

      const before = previous.objects3D ?? [];
      const after = visualiser.objects3D ?? [];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        useAppStore.getState().add3DObjectHistory(before, after);
      }
    },
  });
};
