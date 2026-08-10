import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { CreateEventReq, CreateEventRes } from "../types/http";

export const useCreateEvent = () => {
  // const setCode = useAppStore((s) => s.setCode);
  // const setActiveItemId = useAppStore((s) => s.setActiveItemId);

  return useMutation({
    mutationFn: (event: CreateEventReq) => api.post<CreateEventReq, CreateEventRes>("/api/v1/events", event),
  });
};
