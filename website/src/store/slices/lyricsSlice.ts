import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";

import type { Option } from "../../types/types";

export type InputMode = "raw" | "rich" | "bump" | "timing";
export const InputModes: Option<InputMode>[] = [
  {
    value: "raw",
    label: "Edit lyrics",
  },
  {
    value: "rich",
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
  setInputMode: (mode: InputMode) => void;
  onBeginAddingLyrics: () => void;
}

export const lyricsSlice: StateCreator<AppStore, [], [], LyricsSlice> = (set) => ({
  inputMode: "rich",

  setInputMode: (inputMode: InputMode) => set({ inputMode: inputMode }),

  onBeginAddingLyrics: () => {
    set({
      inputMode: "raw",
    });
  },
});
