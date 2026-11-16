import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

// Duplicate an event given its ID
export type DuplicateEventReq = {
  eventId: string;
};

export const useDuplicateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["event-config-1"],
    mutationFn: ({ eventId }: DuplicateEventReq) =>
      api.post<DuplicateEventReq, { eventId: string }>(`/api/v2/events/${eventId}/duplicate`, { eventId }),
    onSuccess: (res) => {
      // Invalidate the list of events so that the new duplicate appears in the list
      queryClient.invalidateQueries({ queryKey: ["events"] });

      return res.eventId; // Return the new event ID so the caller can navigate to it
    },
  });
};
