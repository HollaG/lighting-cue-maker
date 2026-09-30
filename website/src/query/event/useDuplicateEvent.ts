import { useMutation } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { DuplicateEventReq, DuplicateEventRes } from "../../types/http";

export const useDuplicateEvent = () => {
  return useMutation({
    mutationFn: (event: DuplicateEventReq) =>
      api.post<DuplicateEventReq, DuplicateEventRes>("/api/v1/events/duplicate", event),
  });
};
