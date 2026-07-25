import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";
import { api } from "../../lib/api";
import type { UpdateItemRes } from "../../types/http";
import type { Option } from "../../types/types";
import type { GetItemRefetchFn } from "../../query/useGetItem";

export type InputMode = "raw" | "rich" | "bump" | "timing";
export const InputModes: Option<InputMode>[] = [
  {
    value: "raw",
    label: "Edit lyrics",
  },
  {
    value: "rich",
    label: "Edit cues",
  },
  {
    value: "bump",
    label: "Edit bump cues",
  },
  {
    value: "timing",
    label: "Add timing to lyrics",
  },
];

export interface LyricsSlice {
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  onBeginAddingLyrics: () => void;
  onFinishAddingLyrics: (rawLyrics: string, refetchItem: GetItemRefetchFn) => Promise<void>;
}

export const lyricsSlice: StateCreator<AppStore, [], [], LyricsSlice> = (set, get) => ({
  inputMode: "rich",

  setInputMode: (inputMode: InputMode) => set({ inputMode: inputMode }),

  onBeginAddingLyrics: () => {
    set({
      inputMode: "raw",
    });
  },

  onFinishAddingLyrics: async (rawLyrics: string, refetchItem: GetItemRefetchFn) => {
    const { activeItemId } = get();
    set({
      inputMode: "rich",
    });

    if (activeItemId) {
      try {
        await api.patch<UpdateItemRes>(`/api/v1/items/${activeItemId}`, { rawLyrics });
        refetchItem();
      } catch {}
    }
  },
});
