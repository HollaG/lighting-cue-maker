import { create } from "zustand";
import type { PresenceInformation, PresenceInformationMap } from "../types/presence";

type PresenceStore = {
  presenceInformationMap: PresenceInformationMap;
  mergePresence: (presence: PresenceInformation) => void;
  clearPresence: () => void;
};

/** Ephemeral realtime presence, isolated from the rest of the application state. */
export const usePresenceStore = create<PresenceStore>((set) => ({
  presenceInformationMap: {},
  mergePresence: (presence) =>
    set((state) => ({
      presenceInformationMap: {
        ...state.presenceInformationMap,
        [presence.id]: {
          ...state.presenceInformationMap[presence.id],
          ...presence,
        },
      },
    })),
  clearPresence: () => set({ presenceInformationMap: {} }),
}));
