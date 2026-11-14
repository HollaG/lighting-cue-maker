import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Timeline } from "../../types-v2/timeline";

// Keep in sync with getTimeline in server/internal/api/v2/timelines/handler.go.
export type GetTimelineRes = {
  /** null until the item's timeline is first saved. */
  timeline: Timeline | null;
};

export const makeGetTimelineQueryKey = (eventId: string, itemId: string) =>
  ["v2", "timeline", eventId, itemId] as const;

export const timelineUrl = (eventId: string, itemId: string) =>
  `/api/v2/events/${encodeURIComponent(eventId)}/items/${encodeURIComponent(itemId)}/timeline`;

/**
 * The item's main timeline, or `null` if it has none yet (show an empty timeline: the first save creates it).
 * Clips only hold an `audioFileId`; their playback URLs come from useGetAudioFiles. Pass `null` for either id to wait.
 */
export const useGetTimeline = (eventId: string | null | undefined, itemId: string | null | undefined) => {
  const query = useQuery({
    queryKey: makeGetTimelineQueryKey(eventId ?? "", itemId ?? ""),
    queryFn: async () => {
      const res = await api.get<GetTimelineRes>(timelineUrl(eventId!, itemId!));
      return res.timeline;
    },
    enabled: !!eventId && !!itemId,
  });

  return {
    timeline: query.data ?? null,
    refetchTimeline: query.refetch,
    isTimelineLoading: query.isLoading,
    isTimelineError: query.isError,
    timelineError: query.error,
  };
};
