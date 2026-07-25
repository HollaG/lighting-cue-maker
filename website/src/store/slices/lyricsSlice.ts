import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";

import type { Option } from "../../types/types";
import { generateRich } from "../../utils/convertText";
import { getCueOrder } from "../../utils/cueUtils";
import { sanitize } from "../../utils/sanitize";

export type InputMode = "raw" | "cue" | "bump" | "timing";
export const InputModes: Option<InputMode>[] = [
  {
    value: "raw",
    label: "Edit lyrics",
  },
  {
    value: "cue",
    label: "Edit cues",
  },
  {
    value: "bump",
    label: "Edit bump cues",
  },
  {
    value: "timing",
    label: "Add timing to lyrics",
  },
];

export interface LyricsSlice {
  inputMode: InputMode;
  content: string[][];
  cueOrder: string[];
  setInputMode: (mode: InputMode) => void;
  setDerivedLyrics: (rawLyrics: string) => void;
  onBeginAddingLyrics: () => void;
}

export const lyricsSlice: StateCreator<AppStore, [], [], LyricsSlice> = (set) => ({
  inputMode: "cue",
  content: [],
  cueOrder: [],

  setInputMode: (inputMode: InputMode) => set({ inputMode: inputMode }),

  // Only a SINGLE CALL to this is allowed PER react-query query.
  setDerivedLyrics: (rawLyrics: string) => {
    // Sanitize the input
    const cleaned = sanitize(rawLyrics);
    set({
      content: generateRich(cleaned),
      cueOrder: getCueOrder(cleaned),
    });
  },

  onBeginAddingLyrics: () => {
    set({
      inputMode: "raw",
    });
  },
});
