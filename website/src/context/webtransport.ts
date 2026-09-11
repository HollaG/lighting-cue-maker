import { createContext, useContext } from "react";

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

export const ClientMessageType = {
  ClientMessageSetName: "client.setName",

  ClientMessageRoomJoin: "client.room.join",
  ClientMessageRoomLeave: "client.room.leave",

  ClientMessageInvalidateQuery: "client.invalidateQuery",
} as const;

export type ClientMessageType = (typeof ClientMessageType)[keyof typeof ClientMessageType];

export type ClientMessageInvalidateQueryData = {
  queryKey: string[];
};

export const ServerMessageType = {
  ServerMessageClientRegisteredAck: "server.client.register.ack",
  ServerMessageClientSetNameAck: "server.client.name.ack",
  ServerMessageRoomJoined: "server.room.joined",
  ServerMessageRoomLeft: "server.room.left",
  ServerMessageHelloAck: "server.hello.ack",

  ServerMessageInvalidateQuery: "server.invalidateQuery",
} as const;

export type ServerMessageType = (typeof ServerMessageType)[keyof typeof ServerMessageType];

export type ServerMessageInvalidateQueryData = {
  queryKey: string[];
};

export type ServerMessageHistory = Partial<Record<ServerMessageType, unknown[]>>;

export type ClientMessage = {
  type: ClientMessageType;
  data: any;
};

export type ServerMessage = {
  type: ServerMessageType;
  data: unknown;
};
