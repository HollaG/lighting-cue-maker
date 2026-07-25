import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";

export interface ItemSlice {
  activeItemId: string | null;
  itemName: string;
  setActiveItemId: (id: string | null) => void;
  setItemName: (itemName: string) => void;
  changeActiveItem: (id: string | null) => void;
}

export const itemSlice: StateCreator<AppStore, [], [], ItemSlice> = (set) => ({
  activeItemId: null,
  itemName: "",

  setActiveItemId: (id: string | null) => set({ activeItemId: id }),
  setItemName: (itemName: string) => set({ itemName }),

  changeActiveItem: (id: string | null) => {
    set({ activeItemId: id });
  },
});
