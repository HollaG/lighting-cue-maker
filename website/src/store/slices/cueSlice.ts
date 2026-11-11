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

  isMovingCue: boolean;
  setIsMovingCue: (isMovingCue: boolean) => void;

  /** Whether we open the DMX drawer for further editing */
  isDmxDrawerOpen: boolean;
  setIsDmxDrawerOpen: (isDmxDrawerOpen: boolean) => void;
  toggleIsDmxDrawerOpen: () => void;

  /** Which fixture is currently being viewed. Used to highlight the fixtures in the visualiser and in the DMX control panel. */
  currentlyViewingFixtureIds: string[];
  setCurrentlyViewingFixtureIds: (fixtureIds: string[]) => void;
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

  isMovingCue: false,
  setIsMovingCue: (isMovingCue) => set({ isMovingCue }),

  isDmxDrawerOpen: false,
  setIsDmxDrawerOpen: (isDmxDrawerOpen) => set({ isDmxDrawerOpen }),
  toggleIsDmxDrawerOpen: () => set((state) => ({ isDmxDrawerOpen: !state.isDmxDrawerOpen })),

  currentlyViewingFixtureIds: [],
  setCurrentlyViewingFixtureIds: (fixtureIds) => set({ currentlyViewingFixtureIds: fixtureIds }),
});
