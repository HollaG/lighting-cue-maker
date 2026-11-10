import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { OptionSet } from "../../types-v2/optionSet";
import { makeGetOptionSetsQueryKey, makeOptionSetsQueryKeyPrefix, optionSetsUrl } from "./useGetOptionSets";
import { makeGetOptionSetQueryKey } from "./useGetOptionSet";

/**
 * Soft-deletes one option set. Cues keep their references to it, so restoring it brings them back
 * (see "Safe setup edits" in the implementation notes).
 */
export const useDeleteOptionSet = (eventId: string, fixtureGroupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    // Step 5 (presets), so the Next button's spinner covers it.
    mutationKey: ["event-config-5"],
    mutationFn: (optionSetId: string) =>
      api.delete<undefined, unknown>(`${optionSetsUrl(eventId, fixtureGroupId)}/${encodeURIComponent(optionSetId)}`),

    onSuccess: (_res, optionSetId) => {
      // Drop it from the cached list straight away, then refetch in the background.
      queryClient.setQueryData<OptionSet[]>(makeGetOptionSetsQueryKey(eventId, fixtureGroupId), (prev) =>
        prev?.filter((o) => o.id !== optionSetId),
      );
      queryClient.removeQueries({ queryKey: makeGetOptionSetQueryKey(eventId, fixtureGroupId, optionSetId) });
      void queryClient.invalidateQueries({ queryKey: makeOptionSetsQueryKeyPrefix(eventId, fixtureGroupId) });
    },
  });
};
