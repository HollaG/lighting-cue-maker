import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Cue } from "../../types-v2/cue";
import { cuesUrl, makeGetCuesQueryKey } from "./useGetCues";
import { makeGetTimelineQueryKey } from "../timeline/useGetTimeline";
import { useOptionalRealtime } from "../../context/realtime";
import { ClientMessageType } from "../../types/realtime/realtime";

/**
 * Soft-deletes one cue. Restoring it brings it back.
 * Removing its marker from `Item.rawLyrics` is a separate item update. The server does remove its timeline markers.
 */
export const useDeleteCue = (eventId: string, itemId: string) => {
  const queryClient = useQueryClient();
  const realtime = useOptionalRealtime();

  return useMutation({
    mutationFn: (cueId: string) =>
      api.delete<undefined, { deleted: boolean }>(`${cuesUrl(eventId, itemId)}/${encodeURIComponent(cueId)}`),

    onSuccess: (_res, cueId) => {
      // Drop it from the cached list straight away, then refetch in the background.
      queryClient.setQueryData<Cue[]>(makeGetCuesQueryKey(eventId, itemId), (prev) =>
        prev?.filter((c) => c.id !== cueId),
      );
      void queryClient.invalidateQueries({ queryKey: makeGetCuesQueryKey(eventId, itemId) });
      // The server also removed the cue's markers from the item's timeline (same transaction): refetch it too.
      void queryClient.invalidateQueries({ queryKey: makeGetTimelineQueryKey(eventId, itemId) });
      // Tell the others in the event (realtime) to refetch both.
      realtime?.sendMessage(ClientMessageType.ClientMessageInvalidateQuery, {
        queryKey: [...makeGetCuesQueryKey(eventId, itemId)],
      });
      realtime?.sendMessage(ClientMessageType.ClientMessageInvalidateQuery, {
        queryKey: [...makeGetTimelineQueryKey(eventId, itemId)],
      });
    },
  });
};
