import { useQuery } from "@tanstack/react-query";
import { fetchCues, makeGetCuesQueryKey } from "./useGetCues";

/**
 * One cue, read from its item's cue list. There is no single-cue endpoint on purpose: this shares the list's
 * cache entry, so optimistic updates, saves and realtime refreshes that patch the list show up here too,
 * and a whole item's cards cost one request. `select` means a card only re-renders when its own cue changes.
 * Pass `null` for any id to wait.
 */
export const useGetCue = (
  eventId: string | null | undefined,
  itemId: string | null | undefined,
  cueId: string | null | undefined,
) => {
  const query = useQuery({
    queryKey: makeGetCuesQueryKey(eventId ?? "", itemId ?? ""),
    queryFn: () => fetchCues(eventId!, itemId!),
    select: (cues) => cues.find((c) => c.id === cueId) ?? null,
    enabled: !!eventId && !!itemId && !!cueId,
  });

  return {
    /** `null` while loading, or if the cue is not in the list (e.g. deleted). */
    cue: query.data ?? null,
    refetchCue: query.refetch,
    isCueLoading: query.isLoading,
    isCueError: query.isError,
    cueError: query.error,
  };
};
