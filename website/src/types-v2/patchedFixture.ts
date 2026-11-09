import type { Timestamps } from "./common";

/**
 * A "real" fixture placed in an event.
 *
 * `fixtureTemplateId` and `modeId` reference the copy stored inside the Event's fixtureTemplates.
 */
export type PatchedFixture = Timestamps & {
  id: string;
  eventId: string;

  fixtureTemplateId: string;
  modeId: string;

  name: string;

  /** in cm, default 0 */
  posX: number;
  /** in cm, default 0 */
  posY: number;
  /** in cm, default 0 */
  posZ: number;

  /** rotation (deg). TODO: decide if we want radians instead default 0 */
  rotX: number;
  /** in deg default 0 */
  rotY: number;
  /** in deg default 0 */
  rotZ: number;
};

/** No `id` = create, `id` = update. `eventId` comes from the URL. */
export type UpsertPatchedFixture = Omit<Partial<PatchedFixture>, "createdAt" | "updatedAt" | "deletedAt">;
