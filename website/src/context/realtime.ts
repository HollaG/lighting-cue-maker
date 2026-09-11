import { createContext, useContext } from "react";
import type { RealtimeTransportKind } from "../realtime/connection";
import type { ClientMessageType, ServerMessageHistory, ServerMessageType } from "../types/realtime";

export interface RealtimeContextValue {
  eventId: string;
  status: "connecting" | "connected" | "closed" | "error";
  transport: RealtimeTransportKind | null;
  error: Error | null;
  history: ServerMessageHistory;
  sendMessage: (type: ClientMessageType, data: unknown) => void;
  registerListener: (type: ServerMessageType, listener: (data: unknown) => void) => () => void;
}

export const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error("useRealtime must be used within RealtimeProvider");
  return context;
}
