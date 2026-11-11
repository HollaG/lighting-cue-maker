import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Cue } from "../../types-v2/cue";

export type GetCuesRes = {
  cues: Cue[];
};

export const makeGetCuesQueryKey = (eventId: string, itemId: string) => ["v2", "cues", eventId, itemId] as const;

export const cuesUrl = (eventId: string, itemId: string) =>
  `/api/v2/events/${encodeURIComponent(eventId)}/items/${encodeURIComponent(itemId)}/cues`;

/** Shared by useGetCues and useGetCue so both fill the same cache entry the same way. */
export const fetchCues = async (eventId: string, itemId: string) => {
  const res = await api.get<GetCuesRes>(cuesUrl(eventId, itemId));
  return res.cues;
};

/**
 * All cues of one item, oldest first. The server does NOT order them by position: cue order comes from the
 * markers in `Item.rawLyrics`, so the client orders them. Pass `null` for either id to wait.
 */
export const useGetCues = (eventId: string | null | undefined, itemId: string | null | undefined) => {
  const query = useQuery({
    queryKey: makeGetCuesQueryKey(eventId ?? "", itemId ?? ""),
    queryFn: () => fetchCues(eventId!, itemId!),
    enabled: !!eventId && !!itemId,
  });

  return {
    cues: query.data ?? [],
    refetchCues: query.refetch,
    isCuesLoading: query.isLoading,
    isCuesError: query.isError,
    cuesError: query.error,
  };
};
