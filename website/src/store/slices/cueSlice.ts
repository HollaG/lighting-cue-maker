import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";

export interface CueSlice {
  currentlySelectedCueId: string | undefined;
  setCurrentlySelectedCueId: (cueId: string | undefined) => void;

  showCues: boolean;
  setShowCues: (showCues: boolean) => void;
  toggleShowCues: () => void;
}

export const cueSlice: StateCreator<AppStore, [], [], CueSlice> = (set) => ({
  currentlySelectedCueId: undefined,
  setCurrentlySelectedCueId: (cueId) => {
    set({ currentlySelectedCueId: cueId });
  },

  showCues: true,
  setShowCues: (showCues) => set({ showCues }),
  toggleShowCues: () => set((state) => ({ showCues: !state.showCues, currentlySelectedCueId: undefined })),
});
