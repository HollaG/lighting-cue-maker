import type { Timestamps } from "./common";

/**
 * A named set of patched fixtures in an event, e.g. "Front wash".
 * Users pick options per group in each cue.
 *
 * Keep in sync with FixtureGroup in server/internal/models/v2/fixture_group.go.
 *
 * Rules (see docs/v2-implementation-notes.md, "Fixture groups"):
 * 1. Every `grid.cells[].fixtureId` must be in `fixtureIds`.
 * 2. A member without a cell is allowed; effects skip it.
 * 3. At most one cell per fixture/head pair, and at most one cell per grid position.
 * Only change `fixtureIds` / `grid` through helpers that keep these in sync.
 */
export type FixtureGroup = Timestamps & {
  id: string;
  eventId: string;

  name: string;
  description: string;

  /** Membership: PatchedFixture ids. */
  fixtureIds: string[];

  /** Optional layout for effects. `null` = no layout yet. */
  grid: Grid | null;

  /** Position in the cue card. */
  sortOrder: number;

  // TODO: optionSets?: OptionSet[] once the OptionSet type exists (server preloads it on GET).
};

/** Layout of a group's fixtures (heads) on a grid, used by pattern and movement effects. */
export type Grid = {
  cols: number;
  rows: number;
  cells: GridCell[];
};

/** One fixture head placed on the grid. */
export type GridCell = {
  /** PatchedFixture id. Must be in the group's `fixtureIds`. */
  fixtureId: string;
  /** Head index within the fixture's mode. 0 for single-head fixtures. */
  head: number;
  /** 0-based column. */
  col: number;
  /** 0-based row. */
  row: number;
};

/** No `id` = create, `id` = update. `eventId` comes from the URL. */
export type UpsertFixtureGroup = Omit<Partial<FixtureGroup>, "eventId" | "createdAt" | "updatedAt" | "deletedAt">;
