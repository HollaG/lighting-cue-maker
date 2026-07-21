import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";
import { api } from "../../lib/api";
import { generateRich } from "../../utils/convertText";
import type { Item } from "../../types/types";

export interface ItemSlice {
  activeItem: Item | null;
  items: Item[];
  itemName: string;
  setActiveItem: (item: Item | null) => void;
  setItemName: (name: string) => void;
  changeActiveItem: (item: Item | null) => void;
  onAddItem: () => Promise<void>;
  fetchItems: () => Promise<void>;
}

export const createItemSlice: StateCreator<AppStore, [], [], ItemSlice> = (set, get) => ({
  activeItem: null,
  items: [],
  itemName: "",

  setActiveItem: (item: Item | null) => set({ activeItem: item }),
  setItemName: (itemName: string) => set({ itemName }),

  changeActiveItem: (newItem: Item | null) => {
    set({ activeItem: newItem });
    if (newItem) {
      const lyrics = newItem.rawLyrics ?? "";
      set({
        rawLyrics: lyrics,
        content: generateRich(lyrics),
      });
      get().fetchCues();
    } else {
      set({
        rawLyrics: "",
        content: [],
        cues: [],
        cueOrder: [],
      });
    }
  },

  fetchItems: async () => {
    const eventId = get().event?.id;
    if (!eventId || !get().isValidEvent) return;
    try {
      const res = await api.get<{ items: Item[] }>(`/api/v1/events/${eventId}/items`);
      set({ items: res?.items ?? [] });
    } catch {
      set({ items: [] });
    }
  },

  onAddItem: async () => {
    const { event, isValidEvent, itemName, changeActiveItem, fetchItems } = get();
    if (!event?.id || !isValidEvent || !itemName.trim()) return;
    try {
      const res = await api.post<{ item: Item }>(`/api/v1/events/${event.id}/items`, {
        name: itemName,
      });
      if (res?.item) {
        changeActiveItem(res.item);
      }
      await fetchItems();
      set({ itemName: "" });
    } catch {}
  },
});
