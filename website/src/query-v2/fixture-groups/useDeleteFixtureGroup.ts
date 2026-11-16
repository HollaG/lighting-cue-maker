import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { FixtureGroup } from "../../types-v2/fixtureGroups";
import { makeGetFixtureGroupsQueryKey } from "./useGetFixtureGroups";
import { invalidateVisualiserData, makeGetVisualiserDataQueryKey } from "../visualiser-data/useGetVisualiserData";
import { useOptionalRealtime } from "../../context/realtime";
import { ClientMessageType } from "../../types/realtime/realtime";

/** Soft-deletes one fixture group. */
export const useDeleteFixtureGroup = (eventId: string) => {
  const queryClient = useQueryClient();
  const realtime = useOptionalRealtime();

  return useMutation({
    // Step 3 (fixture groups), so the Next button's spinner covers it.
    mutationKey: ["event-config-3"],
    mutationFn: (fixtureGroupId: string) =>
      api.delete<undefined, unknown>(
        `/api/v2/events/${encodeURIComponent(eventId)}/fixture-groups/${encodeURIComponent(fixtureGroupId)}`,
      ),

    onSuccess: (_res, fixtureGroupId) => {
      // Drop it from the cached list straight away, then refetch in the background.
      queryClient.setQueryData<FixtureGroup[]>(makeGetFixtureGroupsQueryKey(eventId), (prev) =>
        prev?.filter((g) => g.id !== fixtureGroupId),
      );
      void queryClient.invalidateQueries({ queryKey: makeGetFixtureGroupsQueryKey(eventId) });
      invalidateVisualiserData(queryClient, eventId);
      // Currently a no-op: EditEvent (the setup pages) has no RealtimeProvider.
      realtime?.sendMessage(ClientMessageType.ClientMessageInvalidateQuery, {
        queryKey: [...makeGetFixtureGroupsQueryKey(eventId)],
      });
      realtime?.sendMessage(ClientMessageType.ClientMessageInvalidateQuery, {
        queryKey: [...makeGetVisualiserDataQueryKey(eventId)],
      });
    },
  });
};
