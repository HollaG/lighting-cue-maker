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
 * Optimistic: the cache gets the patch at once. Components still see it a macrotask later (React Query notifies via
 * setTimeout 0), so a drag-and-drop UI needs its own local state for the drop render (see TimelineWrapper).
 *
 * - Saves of one timeline run one at a time (`scope`), so a slow earlier save can't land after a newer one.
 * - A failed save refetches the timeline, so the screen shows what the server has.
 */
export const useUpsertTimeline = (eventId: string, itemId: string) => {
  const queryClient = useQueryClient();
  const queryKey = makeGetTimelineQueryKey(eventId, itemId);
  const mutationKey = ["upsertTimeline", eventId, itemId];

  /** Merges the patch into the cached timeline (no-op if there's none yet: the server creates it). */
  const applyToCache = (patch: UpsertTimeline) =>
    queryClient.setQueryData<Timeline | null>(queryKey, (prev) => (prev ? { ...prev, ...withoutUndefined(patch) } : prev));

  const mutation = useMutation({
    mutationKey,
    scope: { id: `upsertTimeline-${eventId}-${itemId}` },
    mutationFn: (timeline: UpsertTimeline) =>
      api.post<UpsertTimelineReq, UpsertTimelineRes>(timelineUrl(eventId, itemId), { timeline }),

    onMutate: async (patch) => {
      // A fetch in flight would bring back data without this change: cancel it.
      await queryClient.cancelQueries({ queryKey });
      // Already done by saveTimeline; repeated so a plain mutate is optimistic too (merging twice is harmless).
      applyToCache(patch);
    },

    onSuccess: (res) => {
      // A newer save of this timeline is still queued: its optimistic data is newer than this response.
      if (queryClient.isMutating({ mutationKey }) > 1) return;
      queryClient.setQueryData<Timeline | null>(queryKey, res.timeline);
    },

    onError: () => {
      // Show the server's version again (a snapshot would already contain this change, see saveTimeline).
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  /**
   * Updates the cache now (onMutate only runs after an await), then saves. Resolves with the saved timeline, or
   * undefined if it was rejected (already reported and refetched, so callers can ignore it).
   */
  const saveTimeline = (patch: UpsertTimeline) => {
    applyToCache(patch);
    return mutation.mutateAsync(patch).catch(() => undefined);
  };

  return { ...mutation, saveTimeline };
};

/** Copy of `obj` without keys whose value is undefined. */
const withoutUndefined = <T extends object>(obj: T): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
