import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { UpdateEventReq, UpdateEventRes } from "../types/http";

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, requestBody }: { eventId: string; requestBody: UpdateEventReq }) =>
      api.patch<UpdateEventReq, UpdateEventRes>(`/api/v1/events/${eventId}`, requestBody),
    onSuccess: ({ event }, { eventId }) => {
      // The aggregate PATCH returns the canonical event, including UUIDs that
      // the backend generated for newly created groups and attributes.
      queryClient.setQueryData(["events", eventId], event);
    },
  });
};
