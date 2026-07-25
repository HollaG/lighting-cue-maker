import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { CreateEventReq, CreateEventRes } from "../types/http";

export const useCreateEvent = ({ event }: { event: CreateEventReq }) => {
  const {} = useMutation({
    mutationFn: () =>
      api.post<CreateEventReq, CreateEventRes>("/api/v1/events", {
        ...event,
      }),
    onSuccess: () => {
      console.log("Event created");
    },
  });
};
