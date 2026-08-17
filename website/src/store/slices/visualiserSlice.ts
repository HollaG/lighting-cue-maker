import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";

export interface VisualiserSlice {
  activeObjectId: string | null;

  isSelected: (id: string) => boolean;
  setActiveObjectId: (id: string | null) => void;
}

export const visualiserSlice: StateCreator<AppStore, [], [], VisualiserSlice> = (set, get) => ({
  activeObjectId: null,
  setActiveObjectId: (id: string | null) => set({ activeObjectId: id }),

  isSelected: (id: string) => {
    return get().activeObjectId === id;
  },
});
