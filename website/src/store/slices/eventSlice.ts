import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";

export interface EventSlice {
  code: string;

  // This function is only allowed to be called from src\routes\events\$eventId\index.tsx.
  setCode: (code: string) => void;

  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
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
});
