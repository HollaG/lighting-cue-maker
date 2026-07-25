import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";

export interface CueSlice {
  currentlySelectedCueId: string | undefined;
  setCurrentlySelectedCueId: (cueId: string | undefined) => void;
}

export const cueSlice: StateCreator<AppStore, [], [], CueSlice> = (set) => ({
  currentlySelectedCueId: undefined,
  setCurrentlySelectedCueId: (cueId) => {
    console.log(cueId);
    set({ currentlySelectedCueId: cueId });
  },
});
