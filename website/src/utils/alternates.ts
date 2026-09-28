import type { Cue } from "../types/cues";
import type { UpdateAlternateCueReq } from "../types/alternate-cue";

/** Keep alternate metadata out of the cue editing form and its autosave requests. Because `AlternateCue` is essentially an extension of `Cue`, we don't want its metadata to pollute Cue's data. */
export const cueFormValues = (cue: Cue): Cue => ({
  id: cue.id,
  comments: cue.comments,
  assignments: cue.assignments,
  cueConfig: cue.cueConfig,
  transition: cue.transition,
  createdAt: cue.createdAt,
  updatedAt: cue.updatedAt,
  deletedAt: cue.deletedAt,
  updatedBy: cue.updatedBy,
});

/** Select only cue content accepted by the alternate update endpoint. */
export const alternateUpdateValues = (cue: Cue): UpdateAlternateCueReq => ({
  assignments: cue.assignments,
  comments: cue.comments,
  transition: cue.transition,
  cueConfig: cue.cueConfig,
});
