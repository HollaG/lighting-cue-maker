import { useQueryClient } from "@tanstack/react-query";
import type { Timeline, TimelineSection } from "../../types-v2/timeline";
import { makeGetTimelineQueryKey } from "./useGetTimeline";
import { useUpsertTimeline } from "./useUpsertTimeline";

// Sections aren't rows in the DB: they live in the timeline's `sections` array, which the server replaces as a whole.
// So upserting one section means: take the timeline from the useGetTimeline cache, create or update that one
// section in the array (by `id`), and save the whole array with useUpsertTimeline.

/** Omit / Partial applied to each member of a union, so `type` still narrows the other fields. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type DistributivePartial<T> = T extends unknown ? Partial<T> : never;

/** A whole new section. `id` is optional: one is generated if left out. */
export type NewTimelineSection = DistributiveOmit<TimelineSection, "id"> & { id?: string };

/** Changes to an existing section: the given fields are merged in, the rest keep their value. */
export type TimelineSectionPatch = { id: string } & DistributivePartial<DistributiveOmit<TimelineSection, "id">>;

/**
 * Creates or updates one section of the item's main timeline.
 *
 * - `id` matches a section: the fields given are merged into it.
 * - Otherwise (no `id`, or an unknown one): the section is added, so pass a whole section then.
 *
 * Optimistic and serialised like useUpsertTimeline. The timeline is read from the cache at call time (not from a
 * render), so quick edits in a row each build on the one before.
 */
export const useUpsertTimelineSectionItem = (eventId: string, itemId: string) => {
  const queryClient = useQueryClient();
  const { saveTimeline, isPending } = useUpsertTimeline(eventId, itemId);

  /** Resolves with the saved timeline, or undefined if the server rejected it (already reported and refetched). */
  const upsertSection = (section: NewTimelineSection | TimelineSectionPatch) => {
    const current = queryClient.getQueryData<Timeline | null>(makeGetTimelineQueryKey(eventId, itemId));
    const sections = current?.sections ?? [];
    const existing = section.id ? sections.find((s) => s.id === section.id) : undefined;

    const nextSections = existing
      ? sections.map((s) => (s.id === existing.id ? ({ ...s, ...section } as TimelineSection) : s))
      : [...sections, { ...section, id: section.id ?? crypto.randomUUID() } as TimelineSection];

    // No timeline yet: this save creates it, and a new timeline needs snapEnabled.
    return saveTimeline(current ? { sections: nextSections } : { sections: nextSections, snapEnabled: true });
  };

  /** Removes the section with this id (no-op save if it isn't there). */
  const deleteSection = (id: string) => {
    const current = queryClient.getQueryData<Timeline | null>(makeGetTimelineQueryKey(eventId, itemId));
    if (!current) return Promise.resolve(undefined);
    return saveTimeline({ sections: current.sections.filter((s) => s.id !== id) });
  };

  /**
   * Swaps the section with this id for `replacements` (e.g. the two halves of a split), in ONE save: two upserts would
   * leave a moment where the halves overlap the original, which the server rejects.
   */
  const replaceSection = (id: string, replacements: TimelineSection[]) => {
    const current = queryClient.getQueryData<Timeline | null>(makeGetTimelineQueryKey(eventId, itemId));
    if (!current) return Promise.resolve(undefined);
    return saveTimeline({ sections: current.sections.flatMap((s) => (s.id === id ? replacements : [s])) });
  };

  return { upsertSection, deleteSection, replaceSection, isSectionSaving: isPending };
};
