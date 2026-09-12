import { create } from "zustand";
import type { PresenceInformationMap, ServerMessagePresenceUpdateData } from "../types/realtime";

type PresenceStore = {
  presenceInformationMap: PresenceInformationMap;
  mergePresence: (presence: ServerMessagePresenceUpdateData) => void;
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
