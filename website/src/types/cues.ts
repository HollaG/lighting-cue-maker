import type { Option } from "./types";

/**
 * Cues indicate
 */
export interface Cue {
  id: string; // must be generated and stable, so that if cue X-1 is deleted, then ... (idk lol)
  cueNumber: number; // duplicate of index

  comments: string;

  assignments: FixtureGroupsAssignment;
}

type FixtureGroupsAssignment = {
  [groupId: string]: FixtureGroupAssignment;
};

type FixtureGroupAssignment = {
  [attributeId: string]: Option;
};
