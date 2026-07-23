import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";

export interface EventSlice {
  code: string;
  setCode: (code: string) => void;
}

export const createEventSlice: StateCreator<AppStore, [], [], EventSlice> = (set) => ({
  code: "",

  setCode: (code: string) => {
    set({ code });
  },
});
