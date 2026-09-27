import type { Cue } from "./cues";

export type AlternateCue = {
  /** This is the ID of the alternate. Not to be confused with the ID of the cue. */
  id: string; // TODO: we need to decide if we want to do it like this, because we run into issues where we're reading `alternate.id` and expecitng it to be the cue.id

  cueId: string;

  /** Name of the alternate cue */
  name: string;
  type: AlternateCueType;
} & Omit<Cue, "id">;

export type AlternateCueType = "user" | "ai";

export type GetAlternateCuesRes = {
  alternateCues: AlternateCue[];
};

/**
 * Create an alternate cue.
 * Note that the creation of an alternate cue MUST provide initial values (which will be copied from the Main cue.)
 */
export type CreateAlternateCueReq = Omit<Cue, "id" | "createdAt" | "updatedAt" | "deletedAt"> &
  Pick<AlternateCue, "cueId" | "name" | "type">;

export type CreateAlternateCueRes = {
  alternateCue: AlternateCue;
};

export type UpdateAlternateCueReq = Partial<
  Omit<AlternateCue, "id" | "cueId" | "createdAt" | "updatedAt" | "deletedAt">
> & {
  id: string;
};

export type UpdateAlternateCueRes = {
  alternateCue: AlternateCue;
  previous: AlternateCue;
};
