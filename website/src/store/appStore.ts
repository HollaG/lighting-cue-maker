import { create } from "zustand";
import { persist } from "zustand/middleware";
import { eventSlice, type EventSlice } from "./slices/eventSlice";
import { itemSlice, type ItemSlice } from "./slices/itemSlice";
import { lyricsSlice, type LyricsSlice, type InputMode } from "./slices/lyricsSlice";
import { cueSlice, type CueSlice } from "./slices/cueSlice";
import { bumpSlice, type BumpSlice } from "./slices/bumpSlice";
import { timingSlice, type TimingSlice } from "./slices/timingSlice";

export type { EventSlice, ItemSlice, LyricsSlice, CueSlice, BumpSlice, InputMode };

export type AppStore = EventSlice & ItemSlice & LyricsSlice & CueSlice & BumpSlice & TimingSlice;

export const useAppStore = create<AppStore>()(
  persist(
    (...a) => ({
      ...eventSlice(...a),
      ...itemSlice(...a),
      ...lyricsSlice(...a),
      ...cueSlice(...a),
      ...bumpSlice(...a),
      ...timingSlice(...a),
    }),
    {
      name: "code",
      partialize: (state) => ({
        code: state.code,
        activeItemId: state.activeItemId,
      }),
    },
  ),
);

// Helper function to initialize event fetch when code was persisted in localStorage
// if (typeof window !== "undefined") {
//   const store = useAppStore.getState();
//   if (store.code && store.code.length === 36) {
//     store.fetchEvent(store.code).then(() => {
//       const activeItem = useAppStore.getState().activeItem;
//       if (activeItem) {
//         useAppStore.getState().changeActiveItem(activeItem);
//       }
//     });
//   }
// }
