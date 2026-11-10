import type { Timestamps } from "./common";

/**
 * One cue of an item (song/segment). Users pick selectables per cue; the LD sets up the option sets.
 *
 * Keep in sync with Cue in server/internal/models/v2/cue.go.
 * There is no order field: a cue's position comes from where its marker appears in `Item.rawLyrics`
 * (see "Cue order" in docs/v2-implementation-notes.md).
 */
export type Cue = Timestamps & {
  id: string;
  itemId: string;

  comments: string;

  transition: CueTransition;
  mode: CueMode;

  /** Fixture groups that are switched on in this cue. */
  activeFixtureGroupIds: string[];
  /** Selectable ids picked in this cue (flat list; the UI keeps a single-select set to one entry). */
  selectableIds: string[];
  /** Per-channel overrides: { [fixtureId]: { [channelId]: value } } */
  overrides: { [fixtureId: string]: { [channelId: string]: number } };
};

/** No `id` = create, `id` = update (a field left out keeps its value). `itemId` comes from the URL. */
export type UpsertCue = Omit<Partial<Cue>, "itemId" | "createdAt" | "updatedAt" | "deletedAt">;

// TODO(draw.io): CueTransition and CueMode are not defined yet. The server stores `transition` as a JSON object
// (replaced as a whole) and `mode` as a string, so these are placeholders until the design says more.
export type CueTransition = Record<string, unknown>;
export type CueMode = string;
