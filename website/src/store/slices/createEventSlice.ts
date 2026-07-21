import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";
import { api } from "../../lib/api";
import type { LightEventConfiguration } from "../../types/types";
import type { GetEventRes } from "../../types/http";

export interface EventSlice {
  code: string;
  setCode: (code: string) => void;
  event: LightEventConfiguration | null;
  isValidEvent: boolean;
  fetchEvent: (codeToFetch?: string) => Promise<void>;
}

export const createEventSlice: StateCreator<AppStore, [], [], EventSlice> = (set, get) => ({
  code: "",
  event: null,
  isValidEvent: false,

  setCode: (code: string) => {
    set({ code });
    if (code && code.length === 36) {
      get().fetchEvent(code);
    } else {
      set({ event: null, isValidEvent: false, items: [], activeItem: null, cues: [], cueOrder: [] });
    }
  },

  fetchEvent: async (codeToFetch?: string) => {
    const targetCode = codeToFetch ?? get().code;
    if (!targetCode || targetCode.length !== 36) {
      set({ event: null, isValidEvent: false });
      return;
    }
    try {
      const res = await api.get<GetEventRes>(`/api/v1/events/${targetCode}`);
      const eventObj = res?.event ?? null;
      const isValid = !!eventObj;
      set({ event: eventObj, isValidEvent: isValid });
      if (isValid) {
        get().fetchItems();
      }
    } catch {
      set({ event: null, isValidEvent: false });
    }
  },
});
