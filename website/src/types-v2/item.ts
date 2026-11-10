import type { Timestamps } from "./common";

/**
 * A band or a dance act
 */
export type Item = Timestamps & {
  id: string;
  eventId: string;
  name: string;

  comments: string;

  rawLyrics: string;
};

/**
 * Lightweight list row: no lyrics, no cues.
 * Keep in sync with ItemOverview in server/internal/models/v2/item.go.
 */
export type ItemOverview = Omit<Item, "rawLyrics" | "deletedAt">;

/** No `id` = create (`name` is required), `id` = update (a field left out keeps its value). `eventId` comes from the URL. */
export type UpsertItem = Omit<Partial<Item>, "eventId" | "createdAt" | "updatedAt" | "deletedAt">;
