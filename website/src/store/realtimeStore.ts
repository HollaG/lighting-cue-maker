import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessageData } from "../types/realtime/chat";
import type { LiveUser } from "../types/realtime/realtime";

type RealtimeStore = {
  roomId: string;
  user: LiveUser | null;
  connectedUsers: LiveUser[]; // INCLUDES the current user.
  seenUserMap: Record<string, LiveUser>;

  messageHistory: ChatMessageData[];

  setCurrentUser: (user: LiveUser | null) => void;
  setConnectedUsers: (users: LiveUser[]) => void;

  setMessageHistory: (messages: ChatMessageData[]) => void;
  onMessageReceived: (message: ChatMessageData) => void;
};

/** Persists the user profile and chat history; connected users are session-only. */
export const useRealtimeStore = create<RealtimeStore>()(
  persist(
    (set) => ({
      roomId: "",
      user: {
        userId: crypto.randomUUID(),
        name: "",
      },
      connectedUsers: [],
      seenUserMap: {}, // keep track of all seen users and their latest state
      messageHistory: [],

      setCurrentUser: (user) =>
        set((state) => ({
          user,
          seenUserMap: user ? { ...state.seenUserMap, [user.userId]: user } : state.seenUserMap,
        })),
      setConnectedUsers: (users) =>
        set((state) => {
          const seenUserMap = { ...state.seenUserMap };

          for (const user of users) {
            seenUserMap[user.userId] = user;
          }

          return {
            connectedUsers: users,
            seenUserMap,
          };
        }),

      setMessageHistory: (messages) => set({ messageHistory: messages }),
      onMessageReceived: (message) =>
        set((state) => ({
          messageHistory: [...state.messageHistory, message],
        })),
    }),
    {
      name: "lighting-realtime",
      partialize: (state) => ({
        user: state.user,
        roomId: state.roomId,
        // messageHistory: state.messageHistory,
        seenUserMap: state.seenUserMap,
      }),
    },
  ),
);
