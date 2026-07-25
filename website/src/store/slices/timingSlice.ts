import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";

export interface TimingSlice {
  inputTimingMode: "main" | "sub";
  setInputTimingMode: (mode: "main" | "sub") => void;

  indicatorNumber: number; // 0 - 9 i guess? for 12/8 timing, they probably need a button
  setIndicatorNumber: (indicatorNumber: number) => void;
}

export const timingSlice: StateCreator<AppStore, [], [], TimingSlice> = (set) => ({
  indicatorNumber: 1,

  inputTimingMode: "main",
  setInputTimingMode: (mode: "main" | "sub") => set({ inputTimingMode: mode }),

  setIndicatorNumber: (indicatorNumber: number) => set({ indicatorNumber }),
});
