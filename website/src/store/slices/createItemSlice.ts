import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";
import { api } from "../../lib/api";
import type { Item, LightEventConfiguration } from "../../types/types";
import type { GetItemsRefetchFn } from "../../query/useGetItems";

export interface ItemSlice {
  activeItemId: string | null;
  itemName: string;
  setActiveItemId: (id: string | null) => void;
  setItemName: (name: string) => void;
  changeActiveItem: (id: string | null) => void;
  onAddItem: (event: LightEventConfiguration, refetchItems: GetItemsRefetchFn) => Promise<void>;
}

export const createItemSlice: StateCreator<AppStore, [], [], ItemSlice> = (set, get) => ({
  activeItemId: null,
  itemName: "",

  setActiveItemId: (id: string | null) => set({ activeItemId: id }),
  setItemName: (itemName: string) => set({ itemName }),

  changeActiveItem: (id: string | null) => {
    set({ activeItemId: id });
  },

  onAddItem: async (event: LightEventConfiguration, refetchItems: GetItemsRefetchFn) => {
    const { itemName, changeActiveItem } = get();
    if (!event?.id || !itemName.trim()) return;
    try {
      const res = await api.post<{ item: Item }>(`/api/v1/events/${event.id}/items`, {
        name: itemName,
      });
      if (res?.item) {
        await refetchItems();
        changeActiveItem(res.item.id);
      }

      set({ itemName: "" });
    } catch {}
  },
});
