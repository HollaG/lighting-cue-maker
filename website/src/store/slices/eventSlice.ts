import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";

export interface EventSlice {
  code: string;

  // This function is only allowed to be called from src\routes\events\$eventId\index.tsx.
  setCode: (code: string) => void;

  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;

  // --- Event page drawers ---------
  // In the store so other components (and the tour) can open them, e.g. a CueCard opening the DMX drawer.
  isEventDetailsDrawerOpen: boolean;
  setIsEventDetailsDrawerOpen: (open: boolean) => void;
  toggleEventDetailsDrawer: () => void;

  isLyricsDrawerOpen: boolean;
  setIsLyricsDrawerOpen: (open: boolean) => void;
  toggleLyricsDrawer: () => void;

  isCuesDrawerOpen: boolean;
  setIsCuesDrawerOpen: (open: boolean) => void;
  toggleCuesDrawer: () => void;

  isTimelineDrawerOpen: boolean;
  setIsTimelineDrawerOpen: (open: boolean) => void;
  toggleTimelineDrawer: () => void;

  isDmxDrawerOpen: boolean;
  setIsDmxDrawerOpen: (open: boolean) => void;
  toggleDmxDrawer: () => void;

  closeAllDrawers: () => void;
}

export const eventSlice: StateCreator<AppStore, [], [], EventSlice> = (set) => ({
  code: "",

  isEditing: false,
  setCode: (code: string) => {
    set({ code });

    // sync to URL ?code= but do not refresh the page
    // const url = new URL(window.location.href);
    // url.searchParams.set("code", code);
    // window.history.pushState({}, "", url);
  },

  setIsEditing(isEditing: boolean) {
    set({ isEditing });
  },

  isEventDetailsDrawerOpen: false,
  setIsEventDetailsDrawerOpen: (open) => set({ isEventDetailsDrawerOpen: open }),
  toggleEventDetailsDrawer: () => set((s) => ({ isEventDetailsDrawerOpen: !s.isEventDetailsDrawerOpen })),

  isLyricsDrawerOpen: false,
  setIsLyricsDrawerOpen: (open) => set({ isLyricsDrawerOpen: open }),
  toggleLyricsDrawer: () => set((s) => ({ isLyricsDrawerOpen: !s.isLyricsDrawerOpen })),

  isCuesDrawerOpen: false,
  setIsCuesDrawerOpen: (open) => set({ isCuesDrawerOpen: open }),
  toggleCuesDrawer: () => set((s) => ({ isCuesDrawerOpen: !s.isCuesDrawerOpen })),

  isTimelineDrawerOpen: false,
  setIsTimelineDrawerOpen: (open) => set({ isTimelineDrawerOpen: open }),
  toggleTimelineDrawer: () => set((s) => ({ isTimelineDrawerOpen: !s.isTimelineDrawerOpen })),

  isDmxDrawerOpen: false,
  setIsDmxDrawerOpen: (open) => set({ isDmxDrawerOpen: open }),
  toggleDmxDrawer: () => set((s) => ({ isDmxDrawerOpen: !s.isDmxDrawerOpen })),

  closeAllDrawers: () =>
    set({
      isEventDetailsDrawerOpen: false,
      isLyricsDrawerOpen: false,
      isCuesDrawerOpen: false,
      isTimelineDrawerOpen: false,
      isDmxDrawerOpen: false,
    }),
});
