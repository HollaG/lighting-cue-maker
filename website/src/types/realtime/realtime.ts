import type { ChatMessageData } from "./chat";
import type { CursorAnchor } from "./cursors";

export type LiveUser = {
  userId: string;
  name: string;
};

export const ClientMessageType = {
  ClientMessageHello: "client.hello",

  ClientMessageSetName: "client.setName",

  ClientMessageRoomJoin: "client.room.join",
  ClientMessageRoomLeave: "client.room.leave",

  ClientMessageInvalidateQuery: "client.invalidateQuery",

  ClientMessagePresenceFollow: "client.presence.follow",
  ClientMessagePresenceUpdate: "client.presence.update",

  ClientMessageChatMessage: "client.chat.message",
} as const;

export type ClientMessageType = (typeof ClientMessageType)[keyof typeof ClientMessageType];

export type ClientMessageHelloData = {
  userId: string;
  name: string;
};

export type ClientMessageInvalidateQueryData = {
  queryKey: string[];
};

// Who to follow. pass null to stop following
export type ClientMessagePresenceFollowData = {
  userId: string | null;
};

export type ClientMessagePresenceUpdateData = {
  // Omitted means unchanged; null hides the cursor. Scroll fields can be added here later.
  cursor?: CursorAnchor | null;
};

export type ClientMessageChatMessageData = Omit<ChatMessageData, "fromId">;

export type ClientMessageDataMap = {
  [ClientMessageType.ClientMessageHello]: ClientMessageHelloData;

  [ClientMessageType.ClientMessageSetName]: {
    name: string;
  };

  [ClientMessageType.ClientMessageRoomJoin]: {
    itemId: string;
  };

  [ClientMessageType.ClientMessageRoomLeave]: {
    itemId: string;
  };

  [ClientMessageType.ClientMessageInvalidateQuery]: ClientMessageInvalidateQueryData;

  [ClientMessageType.ClientMessagePresenceFollow]: ClientMessagePresenceFollowData;

  [ClientMessageType.ClientMessagePresenceUpdate]: ClientMessagePresenceUpdateData;

  [ClientMessageType.ClientMessageChatMessage]: ClientMessageChatMessageData;
};

export const ServerMessageType = {
  ServerMessageClientRegisteredAck: "server.client.register.ack",
  ServerMessageClientHelloAck: "server.hello.ack",
  ServerMessageClientSetNameAck: "server.name.ack",

  ServerMessageRoomJoined: "server.room.joined",
  ServerMessageRoomLeft: "server.room.left",
  ServerMessageHelloAck: "server.hello.ack",

  ServerMessageInvalidateQuery: "server.invalidateQuery",

  ServerMessagePresenceUpdate: "server.presence.update",

  ServerMessageChatMessage: "server.chat.message",
} as const;

export type ServerMessageType = (typeof ServerMessageType)[keyof typeof ServerMessageType];

export type ServerMessageHelloAckData = ClientMessageHelloData & {
  connectionId: string;
};

export type ServerMessageInvalidateQueryData = {
  queryKey: string[];
};

export type ServerMessagePresenceUpdateData = ClientMessagePresenceUpdateData & {
  userId: string;
  name: string;
};

export type ServerMessageHistory = Partial<Record<ServerMessageType, unknown[]>>;
export type ServerMessageLastMessageMap = Partial<Record<ServerMessageType, unknown>>;

export type ClientMessage = {
  type: ClientMessageType;
  data: ClientMessageDataMap[ClientMessageType];
  timestamp: number;
};

export type ServerMessageDataMap = {
  [ServerMessageType.ServerMessageClientRegisteredAck]: {
    ok: boolean;
  };
  [ServerMessageType.ServerMessageClientHelloAck]: ServerMessageHelloAckData;
  [ServerMessageType.ServerMessageClientSetNameAck]: {
    name: string;
  };
  [ServerMessageType.ServerMessageRoomJoined]: {
    itemId: string;
  };
  [ServerMessageType.ServerMessageRoomLeft]: {
    itemId: string;
  };

  [ServerMessageType.ServerMessageInvalidateQuery]: ServerMessageInvalidateQueryData;
  [ServerMessageType.ServerMessagePresenceUpdate]: ServerMessagePresenceUpdateData;

  [ServerMessageType.ServerMessageChatMessage]: ChatMessageData;
};

export type ServerMessage = {
  [Type in ServerMessageType]: {
    type: Type;
    data: ServerMessageDataMap[Type];
    timestamp: number;
  };
}[ServerMessageType];
