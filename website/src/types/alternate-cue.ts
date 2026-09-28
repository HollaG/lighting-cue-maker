import type { Cue } from "./cues";

export type AlternateCue = Cue & {
  /** Unique ID of this alternate; `id` is the parent cue ID. */
  alternateId: string;
  alternateName: string;
  alternateType: AlternateCueType;
};

export type AlternateCueType = "user" | "ai";

export type GetAlternateCuesRes = {
  alternateCues: AlternateCue[];
};

/**
 * Create an alternate cue.
 * Note that the creation of an alternate cue MUST provide initial values (which will be copied from the Main cue.)
 */
export type CreateAlternateCueReq = Omit<Cue, "createdAt" | "updatedAt" | "deletedAt"> &
  Pick<AlternateCue, "alternateName" | "alternateType">;

export type CreateAlternateCueRes = {
  alternateCue: AlternateCue;
};

export type UpdateAlternateCueReq = Partial<Omit<AlternateCue, "id" | "alternateId" | "createdAt" | "updatedAt" | "deletedAt">> &
  Pick<Cue, "id">;

export type UpdateAlternateCueRes = {
  alternateCue: AlternateCue;
  previous: AlternateCue;
};
