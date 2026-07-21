import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createEventSlice, type EventSlice } from "./slices/createEventSlice";
import { createItemSlice, type ItemSlice } from "./slices/createItemSlice";
import { createLyricsSlice, type LyricsSlice, type LyricMode } from "./slices/createLyricsSlice";
import { createCueSlice, type CueSlice } from "./slices/createCueSlice";

export type { EventSlice, ItemSlice, LyricsSlice, CueSlice, LyricMode };

export type AppStore = EventSlice & ItemSlice & LyricsSlice & CueSlice;

export const useAppStore = create<AppStore>()(
  persist(
    (...a) => ({
      ...createEventSlice(...a),
      ...createItemSlice(...a),
      ...createLyricsSlice(...a),
      ...createCueSlice(...a),
    }),
    {
      name: "code",
      partialize: (state) => ({ code: state.code }),
    },
  ),
);

// Helper function to initialize event fetch when code was persisted in localStorage
if (typeof window !== "undefined") {
  const initialCode = useAppStore.getState().code;
  if (initialCode && initialCode.length === 36) {
    useAppStore.getState().fetchEvent(initialCode);
  }
}
