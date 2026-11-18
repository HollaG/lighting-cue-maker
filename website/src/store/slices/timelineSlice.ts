import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";

export interface TimelineSlice {
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
}

export const timelineSlice: StateCreator<AppStore, [], [], TimelineSlice> = (set) => ({
  isPlaying: false,
  setIsPlaying: (isPlaying: boolean) => set({ isPlaying }),
});
