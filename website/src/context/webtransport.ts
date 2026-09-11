import { createContext, useContext } from "react";
import type { ClientMessageType, ServerMessageHistory, ServerMessageType } from "../types/realtime";

export interface WebTransportSession {
  transport: WebTransport;
  controlStream: WebTransportBidirectionalStream;
  writer: WritableStreamDefaultWriter<Uint8Array>;
  reader: ReadableStreamDefaultReader<Uint8Array>;
}

export interface WebTransportContextValue {
  eventId: string;
  status: "connecting" | "connected" | "closed" | "error";
  session: WebTransportSession | null;
  error: Error | null;
  history: ServerMessageHistory;
  sendMessage: (type: ClientMessageType, data: unknown) => void;
  registerListener: (type: ServerMessageType, listener: (data: unknown) => void) => () => void;
}

export const WebTransportContext = createContext<WebTransportContextValue | undefined>(undefined);

export function useWebTransport() {
  const context = useContext(WebTransportContext);
  if (!context) throw new Error("useWebTransport must be used within WebTransportProvider");
  return context;
}

// export const MessageType = {
//   RoomJoin: "room.join",
//   RoomLeave: "room.leave",

//   CursorUpdate: "cursor.update",
// } as const;

// export type MessageType = (typeof MessageType)[keyof typeof MessageType];

// export type Message = {
//   type: MessageType;
//   data: any;
// };
