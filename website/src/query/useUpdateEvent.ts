import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAppStore } from "../store/appStore";
import type { UpdateEventReq, UpdateEventRes } from "../types/http";

export const useUpdateEvent = () => {
  const code = useAppStore((s) => s.code);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, requestBody }: { eventId: string; requestBody: Partial<UpdateEventReq> }) =>
      api.patch<Partial<UpdateEventReq>, UpdateEventRes>(`/api/v1/events/${eventId}`, requestBody),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", code] });
    },
  });
};
