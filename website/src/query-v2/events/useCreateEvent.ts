import { useMutation } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { LightEvent, UpsertLightEvent } from "../../types-v2/event";

// Keep in sync with CreateEventReq in server/internal/models/v2/event.go.
export type CreateEventReq = {
  event: UpsertLightEvent;
  fixtureTemplateIds: string[];
};

export type CreateEventRes = {
  event: LightEvent;
};

export const useCreateEvent = () => {
  return useMutation({
    mutationKey: ["event-config-1"],
    mutationFn: (req: CreateEventReq) => api.post<CreateEventReq, CreateEventRes>("/api/v2/events", req),
  });
};
