// feature[class=Realtime] Shared connection status, message sending and subscriptions

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
  registerListener: <Type extends ServerMessageType>(
    type: Type,
    listener: (data: ServerMessageDataMap[Type]) => void,
  ) => () => void;
}

export const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context)
    throw new Error(
      "useRealtime must be used within RealtimeProvider. If you need to call useRealtime but aren't actually using the values, please call `useOptionalRealtime`.",
    );
  return context;
}

/** Returns no connection outside realtime-enabled routes. */
export function useOptionalRealtime() {
  return useContext(RealtimeContext);
}
