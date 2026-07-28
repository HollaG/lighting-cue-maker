// ─── Types ───────────────────────────────────────────────────────────────────

import type { Cue } from "./cues";

export type QLCFunction = {
  ID: string | null;
  Type: string | null;
  Name: string | null;
  Path: string | null;
  Data: string;
};

export interface QLCCollection extends QLCFunction {
  Type: "Collection";
  Steps: { Number: number; Value: number }[];
}

export interface QLCStep {
  Number: number;
  Value: number;
}

export interface QLCEventJson {
  [itemId: string]: {
    cue: Cue;
    qlcFunctions: QLCFunction[];
  }[];
}
