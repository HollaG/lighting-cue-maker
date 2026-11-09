import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { LightEvent } from "../../types-v2/event";

export type GetEventRes = {
  event: LightEvent;
};

export const makeGetEventQueryKey = (eventId: string | null | undefined) => ["v2", "events", eventId] as const;

/**
 * One event. Pass `null` before the event exists (create mode); the query then waits.
 *
 * TODO: the server doesn't preload children yet (fixtures, groups, visualiser).
 */
export const useGetEvent = (eventId: string | null | undefined) => {
  const query = useQuery({
    queryKey: makeGetEventQueryKey(eventId),
    queryFn: async () => {
      const res = await api.get<GetEventRes>(`/api/v2/events/${eventId}`);
      return res.event;
    },
    enabled: !!eventId,
  });

  return {
    event: query.data,
    refetchEvent: query.refetch,
    isEventLoading: query.isLoading,
    isEventError: query.isError,
    eventError: query.error,
  };
};
