import { useQuery, type QueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { FixtureGroup } from "../../types-v2/fixtureGroups";
import type { FixtureTemplate } from "../../types-v2/fixtureTemplates";
import type { OptionSet } from "../../types-v2/optionSet";
import type { PatchedFixture } from "../../types-v2/patchedFixture";

// Keep in sync with getVisualiserData in server/internal/api/v2/visualiserdata/handler.go.
export type GetVisualiserDataRes = {
  /** Ordered by name, then creation. */
  fixtures: PatchedFixture[];
  /** The event's own template copies (`Event.fixtureTemplates`). */
  fixtureTemplates: FixtureTemplate[];
  /** Ordered by sortOrder, then creation. */
  fixtureGroups: FixtureGroup[];
  /** Every option set of the groups above. Within a group: ordered by sortOrder, then creation. */
  optionSets: OptionSet[];
};

export type VisualiserData = GetVisualiserDataRes & {
  /** `optionSets` split by `fixtureGroupId`, keeping their order. A group without option sets has no key. */
  optionSetsByGroupId: Record<string, OptionSet[]>;
};

export const makeGetVisualiserDataQueryKey = (eventId: string) => ["v2", "visualiserData", eventId] as const;

/**
 * Marks the visualiser data stale. Call it after any change to fixtures, fixture templates, fixture groups or
 * option sets, so the preview doesn't keep showing the old setup until the stale time runs out.
 * Only refetches if something is using the query right now.
 */
export const invalidateVisualiserData = (queryClient: QueryClient, eventId: string) =>
  void queryClient.invalidateQueries({ queryKey: makeGetVisualiserDataQueryKey(eventId) });

/** Module-level, so React Query only reruns it when the response changes. */
const withOptionSetsByGroupId = (data: GetVisualiserDataRes): VisualiserData => {
  const optionSetsByGroupId: Record<string, OptionSet[]> = {};
  for (const optionSet of data.optionSets) {
    (optionSetsByGroupId[optionSet.fixtureGroupId] ??= []).push(optionSet);
  }
  return { ...data, optionSetsByGroupId };
};

/**
 * Everything about an event's setup that turning a cue into DMX values needs, in one request and from one moment.
 *
 * The setup rarely changes once an event is ready, so this stays fresh for 5 minutes. Edits made in this browser
 * refresh it straight away (the setup mutations call `invalidateVisualiserData`). Edits by other people show up
 * after the stale time, or when the window regains focus.
 *
 * Pass `null` to wait.
 */
export const useGetVisualiserData = (eventId: string | null | undefined) => {
  const query = useQuery({
    queryKey: makeGetVisualiserDataQueryKey(eventId ?? ""),
    queryFn: () => api.get<GetVisualiserDataRes>(`/api/v2/events/${encodeURIComponent(eventId!)}/visualiser-data`),
    select: withOptionSetsByGroupId,
    staleTime: 5 * 60 * 1000,
    enabled: !!eventId,
  });

  return {
    /** `null` until loaded. */
    visualiserData: query.data ?? null,
    refetchVisualiserData: query.refetch,
    isVisualiserDataLoading: query.isLoading,
    isVisualiserDataError: query.isError,
    visualiserDataError: query.error,
  };
};
