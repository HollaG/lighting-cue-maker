import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";
import { api } from "../../lib/api";
import { generateRaw, generateRich } from "../../utils/convertText";
import type { UpdateItemRes } from "../../types/http";

export type LyricMode = "raw" | "rich";

export interface LyricsSlice {
  rawLyrics: string;
  setRawLyrics: (rawLyrics: string) => void;
  content: string[][];
  setContent: (content: string[][]) => void;
  lyricInputMode: LyricMode;
  setLyricInputMode: (mode: LyricMode) => void;
  onBeginAddingLyrics: () => void;
  onFinishAddingLyrics: () => Promise<void>;
}

export const createLyricsSlice: StateCreator<AppStore, [], [], LyricsSlice> = (set, get) => ({
  rawLyrics: "",
  content: [],
  lyricInputMode: "raw",

  setRawLyrics: (rawLyrics: string) => set({ rawLyrics }),
  setContent: (content: string[][]) => set({ content }),
  setLyricInputMode: (lyricInputMode: LyricMode) => set({ lyricInputMode }),

  onBeginAddingLyrics: () => {
    const { content } = get();
    const raw = generateRaw(content);
    set({
      rawLyrics: raw,
      lyricInputMode: "raw",
    });
  },

  onFinishAddingLyrics: async () => {
    const { rawLyrics, activeItem, fetchItems, event } = get();
    const richContent = generateRich(rawLyrics);
    set({
      content: richContent,
      lyricInputMode: "rich",
    });

    if (event?.id && activeItem?.id) {
      try {
        const res = await api.patch<UpdateItemRes>(
          `/api/v1/events/${event.id}/items/${activeItem.id}`,
          { rawLyrics },
        );
        await fetchItems();
        if (res?.item) {
          set({ activeItem: res.item });
        }
      } catch {}
    }
  },
});
