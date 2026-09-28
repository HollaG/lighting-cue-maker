import type { Cue } from "../types/cues";

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
