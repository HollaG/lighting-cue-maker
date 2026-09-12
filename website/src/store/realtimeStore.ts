import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessageData } from "../types/realtime/chat";
import type { LiveUser } from "../types/realtime/realtime";

type RealtimeStore = {
  roomId: string;
  user: LiveUser | null;
  connectedUsers: LiveUser[];

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

      messageHistory: [],

      setCurrentUser: (user) => {
        set({ user });
        console.log("setCurrentUser", user);
      },
      setConnectedUsers: (users) => set({ connectedUsers: users }),

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
        messageHistory: state.messageHistory,
      }),
    },
  ),
);
