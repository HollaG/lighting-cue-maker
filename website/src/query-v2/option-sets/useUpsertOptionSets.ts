import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { OptionSet, UpsertOptionSet } from "../../types-v2/optionSet";
import { makeGetOptionSetsQueryKey, makeOptionSetsQueryKeyPrefix, optionSetsUrl } from "./useGetOptionSets";
import { makeGetOptionSetQueryKey } from "./useGetOptionSet";
import { invalidateVisualiserData } from "../visualiser-data/useGetVisualiserData";

// Keep in sync with UpsertOptionSetsReq in server/internal/models/v2/option_set.go.
export type UpsertOptionSetsReq = {
  optionSets: UpsertOptionSet[];
};

export type UpsertOptionSetsRes = {
  optionSets: OptionSet[];
};

/**
 * Create or update several option sets of one fixture group in one request.
 * No `id` = create (name, selectionType and type are required). With `id` = update: a field left out keeps its
 * current value, so partial updates like `{ id, name }` are fine. `selectables` is replaced as a whole.
 */
export const useUpsertOptionSets = (eventId: string, fixtureGroupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    // Step 5 (presets) save, so the Next button's spinner covers it.
    mutationKey: ["event-config-5"],
    mutationFn: (optionSets: UpsertOptionSet[]) =>
      api.post<UpsertOptionSetsReq, UpsertOptionSetsRes>(optionSetsUrl(eventId, fixtureGroupId), { optionSets }),

    onSuccess: (res) => {
      // Merge the saved sets into the cached list (replace by id, append new ones) so the UI updates straight away.
      queryClient.setQueryData<OptionSet[]>(makeGetOptionSetsQueryKey(eventId, fixtureGroupId), (prev) => {
        if (!prev) return prev;
        const saved = new Map(res.optionSets.map((o) => [o.id, o]));
        const updated = prev.map((o) => saved.get(o.id) ?? o);
        const added = res.optionSets.filter((o) => !prev.some((p) => p.id === o.id));
        return [...updated, ...added];
      });
      for (const optionSet of res.optionSets) {
        queryClient.setQueryData(makeGetOptionSetQueryKey(eventId, fixtureGroupId, optionSet.id), optionSet);
      }
      // Then refetch to pick up the server's order (sortOrder).
      void queryClient.invalidateQueries({ queryKey: makeOptionSetsQueryKeyPrefix(eventId, fixtureGroupId) });
      invalidateVisualiserData(queryClient, eventId);
    },
  });
};
