import { createContext, useContext } from "react";
import type { RealtimeTransportKind } from "../realtime/connection";
import type {
  ClientMessageDataMap,
  ClientMessageType,
  ServerMessageDataMap,
  ServerMessageType,
} from "../types/realtime/realtime";

export interface RealtimeContextValue {
  eventId: string;
  status: "connecting" | "connected" | "closed" | "error";
  transport: RealtimeTransportKind | null;
  error: Error | null;
  sendMessage: (type: ClientMessageType, data: ClientMessageDataMap[ClientMessageType]) => void;
  registerListener: (
    type: ServerMessageType,
    listener: (data: ServerMessageDataMap[ServerMessageType]) => void,
  ) => () => void;
}

export const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error("useRealtime must be used within RealtimeProvider");
  return context;
}
