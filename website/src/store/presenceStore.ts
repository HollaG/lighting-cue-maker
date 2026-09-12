import { create } from "zustand";
import type { PresenceInformation, PresenceInformationMap } from "../types/realtime/presence";

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

        // Key by userId OR connectionId.
        // Benefits of userId: only one copy of a user in the map at a time.
        // Benefits of connectionId: allows multiple connections per user, which is useful for debugging.
        [presence.connectionId]: {
          ...state.presenceInformationMap[presence.connectionId],
          ...presence,
        },
      },
    })),
  clearPresence: () => set({ presenceInformationMap: {} }),
}));
