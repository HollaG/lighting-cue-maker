import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";
import { api } from "../../lib/api";
import type { UpdateItemRes } from "../../types/http";
import type { LightEventConfiguration } from "../../types/types";
import type { GetItemRefetchFn } from "../../query/useGetItem";

export type LyricMode = "raw" | "rich";

export interface LyricsSlice {
  lyricInputMode: LyricMode;
  setLyricInputMode: (mode: LyricMode) => void;
  onBeginAddingLyrics: () => void;
  onFinishAddingLyrics: (
    rawLyrics: string,
    event: LightEventConfiguration | null,
    refetchItem: GetItemRefetchFn,
  ) => Promise<void>;
}

export const createLyricsSlice: StateCreator<AppStore, [], [], LyricsSlice> = (set, get) => ({
  lyricInputMode: "rich",

  setLyricInputMode: (lyricInputMode: LyricMode) => set({ lyricInputMode }),

  onBeginAddingLyrics: () => {
    set({
      lyricInputMode: "raw",
    });
  },

  onFinishAddingLyrics: async (rawLyrics: string, event: LightEventConfiguration | null, refetchItem: GetItemRefetchFn) => {
    const { activeItemId } = get();
    set({
      lyricInputMode: "rich",
    });

    if (event?.id && activeItemId) {
      try {
        await api.patch<UpdateItemRes>(`/api/v1/events/${event.id}/items/${activeItemId}`, { rawLyrics });
        refetchItem();
      } catch {}
    }
  },
});
