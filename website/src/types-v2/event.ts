import type { Timestamps } from "./common";
import type { FixtureTemplate } from "./fixtureTemplates";

/**
 * A CueSketch event
 *
 * Note that the database name is `Events`, but the type name is `LightEvent` to avoid confusion with the DOM `Event` type.
 *
 */
export type LightEvent = Timestamps & {
  id: string;
  name: string;
  description?: string;
  externalLink?: string;

  metadata?: Record<string, any>;

  status: EventStatus;

  fixtureTemplates: FixtureTemplate[];
};

/**
 * Whether the LD has finished setting up the event.
 * Keep in sync with EventStatus in server/internal/models/v2/event.go.
 */
export const EventStatus = {
  /** The LD is still going through the setup steps. Users can't see or open the event. */
  CONFIGURING: "configuring",
  /** Setup is done. Users can pick options per cue. */
  READY: "ready",
} as const;
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

/** `status` is ignored on create (always `configuring`). */
export type UpsertLightEvent = Omit<
  LightEvent,
  "id" | "createdAt" | "updatedAt" | "deletedAt" | "fixtureTemplates" | "status"
> & {
  id?: string;
  status?: EventStatus;
};
