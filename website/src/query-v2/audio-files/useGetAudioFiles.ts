import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { AudioFileWithUrl } from "../../types-v2/audioFile";

// Keep in sync with list in server/internal/api/v2/audiofiles/handler.go.
export type GetAudioFilesRes = {
  audioFiles: AudioFileWithUrl[];
};

export const makeGetAudioFilesQueryKey = (eventId: string, itemId: string) =>
  ["v2", "audioFiles", eventId, itemId] as const;

export const audioFilesUrl = (eventId: string, itemId: string) =>
  `/api/v2/events/${encodeURIComponent(eventId)}/items/${encodeURIComponent(itemId)}/audio-files`;

/**
 * Playback links are valid for at least 1 hour. Refetch well before that, so a link in use never expires.
 * The server gives the same link for a file within the same hour, so a refetch doesn't break the browser's cache.
 */
const URL_REFRESH_MS = 30 * 60 * 1000;

/**
 * The item's uploaded audio files (its library), oldest first, each with a playback `url`.
 * Timeline clips look up their file here by `audioFileId`. Pass `null` for either id to wait.
 */
export const useGetAudioFiles = (eventId: string | null | undefined, itemId: string | null | undefined) => {
  const query = useQuery({
    queryKey: makeGetAudioFilesQueryKey(eventId ?? "", itemId ?? ""),
    queryFn: async () => {
      const res = await api.get<GetAudioFilesRes>(audioFilesUrl(eventId!, itemId!));
      return res.audioFiles;
    },
    enabled: !!eventId && !!itemId,
    staleTime: URL_REFRESH_MS,
    // Also while the tab stays open without a refocus (e.g. a long rehearsal).
    refetchInterval: URL_REFRESH_MS,
  });

  return {
    audioFiles: query.data ?? [],
    refetchAudioFiles: query.refetch,
    isAudioFilesLoading: query.isLoading,
    isAudioFilesError: query.isError,
    audioFilesError: query.error,
  };
};
