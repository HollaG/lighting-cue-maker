import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";

export interface EventSlice {
  code: string;
  setCode: (code: string) => void;
}

export const eventSlice: StateCreator<AppStore, [], [], EventSlice> = (set) => ({
  code: "",

  setCode: (code: string) => {
    set({ code });

    // sync to URL ?code= but do not refresh the page
    const url = new URL(window.location.href);
    url.searchParams.set("code", code);
    window.history.pushState({}, "", url);
  },
});
