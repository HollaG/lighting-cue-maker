import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Timeline, UpsertTimeline } from "../../types-v2/timeline";
import { makeGetTimelineQueryKey, timelineUrl } from "./useGetTimeline";

// Keep in sync with UpsertTimelineReqBody in server/internal/models/v2/timeline.go.
export type UpsertTimelineReq = {
  timeline: UpsertTimeline;
};

export type UpsertTimelineRes = {
  timeline: Timeline;
};

/**
 * Saves the item's main timeline; the first save creates it (send `snapEnabled: true` then).
 * A field left out keeps its value; `sections` and `audios` are each replaced as a whole.
 * The server validates the result (overlaps, markers inside sections, cue / audio file ids) and rejects it with a
 * message, which the api helper shows as a notification.
 *
 * - Optimistic: the cache shows the change straight away and rolls back if the save fails.
 * - Saves of one timeline run one at a time (`scope`), so a slow earlier save can't land after a newer one.
 */
export const useUpsertTimeline = (eventId: string, itemId: string) => {
  const queryClient = useQueryClient();
  const queryKey = makeGetTimelineQueryKey(eventId, itemId);
  const mutationKey = ["upsertTimeline", eventId, itemId];

  return useMutation({
    mutationKey,
    scope: { id: `upsertTimeline-${eventId}-${itemId}` },
    mutationFn: (timeline: UpsertTimeline) =>
      api.post<UpsertTimelineReq, UpsertTimelineRes>(timelineUrl(eventId, itemId), { timeline }),

    onMutate: async (patch) => {
      // A fetch in flight would bring back data without this change: cancel it.
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<Timeline | null>(queryKey);
      // No timeline yet: nothing to merge into (the server creates it); the response fills the cache.
      if (previous) {
        queryClient.setQueryData<Timeline | null>(queryKey, { ...previous, ...withoutUndefined(patch) });
      }
      return { previous };
    },

    onSuccess: (res) => {
      // A newer save of this timeline is still queued: its optimistic data is newer than this response.
      if (queryClient.isMutating({ mutationKey }) > 1) return;
      queryClient.setQueryData<Timeline | null>(queryKey, res.timeline);
    },

    onError: (_err, _patch, context) => {
      if (context && context.previous !== undefined) {
        queryClient.setQueryData<Timeline | null>(queryKey, context.previous);
      }
    },
  });
};

/** Copy of `obj` without keys whose value is undefined. */
const withoutUndefined = <T extends object>(obj: T): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
