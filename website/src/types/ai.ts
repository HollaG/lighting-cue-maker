import type { Cue } from "./cues";
import type { FixtureGroupConfiguration } from "./types";

export type AiCreateVersionReq = {
  /** Lyrics for the whole song with all cue markers EXCEPT the concerned cue removed */
  lyrics: string;

  cue: Cue; // only need cueConfig and cueId

  fixtureGroups: FixtureGroupConfiguration[];
};

export type AiCreateVersionRes = {
  cue: Cue; // the fully populated cue
};
