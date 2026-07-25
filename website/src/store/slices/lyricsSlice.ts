import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";

import type { Option } from "../../types/types";
import { generateRich } from "../../utils/convertText";
import { getCueOrder } from "../../utils/cueUtils";

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
    set({
      content: generateRich(rawLyrics),
      cueOrder: getCueOrder(rawLyrics),
    });
  },

  onBeginAddingLyrics: () => {
    set({
      inputMode: "raw",
    });
  },
});
