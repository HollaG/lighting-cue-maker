import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";

export interface CueSlice {
  currentlySelectedCueId: string | undefined;
  setCurrentlySelectedCueId: (cueId: string | undefined) => void;

  showCues: boolean;
  setShowCues: (showCues: boolean) => void;
  toggleShowCues: () => void;

  showCueIdentifiers: boolean;
  setShowCueIdentifiers: (showCueIdentifiers: boolean) => void;
  toggleShowCueIdentifiers: () => void;
}

export const cueSlice: StateCreator<AppStore, [], [], CueSlice> = (set) => ({
  currentlySelectedCueId: undefined,
  showCueIdentifiers: false,
  setCurrentlySelectedCueId: (cueId) => {
    set({ currentlySelectedCueId: cueId });
  },

  showCues: true,
  setShowCues: (showCues) => set({ showCues }),
  setShowCueIdentifiers: (showCueIdentifiers) => set({ showCueIdentifiers }),
  toggleShowCueIdentifiers: () => set((state) => ({ showCueIdentifiers: !state.showCueIdentifiers })),
  toggleShowCues: () => set((state) => ({ showCues: !state.showCues, currentlySelectedCueId: undefined })),
});
