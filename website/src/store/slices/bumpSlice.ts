import type { StateCreator } from "zustand";
import type { BumpConfiguration } from "../../types/types";
import type { AppStore } from "../appStore";

export interface BumpSlice {
  currentlySelectedBumpId: string | undefined;
  setCurrentlySelectedBumpId: (cueId: string | undefined) => void;

  instantAddBumpMode: BumpConfiguration | null;
  setInstantAddBumpMode: (bumpConfiguration: BumpConfiguration) => void;

  onAddBump: () => void;
  onDeleteBump: () => void;
}

export const bumpSlice: StateCreator<AppStore, [], [], BumpSlice> = (set, get) => ({
  currentlySelectedBumpId: undefined,
  setCurrentlySelectedBumpId: (bumpId: string | undefined) => {
    set({ currentlySelectedBumpId: bumpId });
  },

  instantAddBumpMode: null,
  setInstantAddBumpMode: (bumpConfiguration: BumpConfiguration) => {
    set({ instantAddBumpMode: bumpConfiguration });
  },

  onAddBump: () => {
    const { currentlySelectedCueId } = get();
    if (!currentlySelectedCueId) return;

    const { instantAddBumpMode } = get();
    if (!instantAddBumpMode) return;
  },
  onDeleteBump: () => {},
});
