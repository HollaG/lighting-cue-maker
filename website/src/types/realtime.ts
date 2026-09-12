import type { CursorAnchor } from "./cursors";

export const ClientMessageType = {
  ClientMessageSetName: "client.setName",

  ClientMessageRoomJoin: "client.room.join",
  ClientMessageRoomLeave: "client.room.leave",

  ClientMessageInvalidateQuery: "client.invalidateQuery",

  ClientMessagePresenceFollow: "client.presence.follow",
  ClientMessagePresenceUpdate: "client.presence.update",
} as const;

export type ClientMessageType = (typeof ClientMessageType)[keyof typeof ClientMessageType];

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

export type ClientMessageDataMap = {
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
};

export const ServerMessageType = {
  ServerMessageClientRegisteredAck: "server.client.register.ack",
  ServerMessageClientSetNameAck: "server.client.name.ack",
  ServerMessageRoomJoined: "server.room.joined",
  ServerMessageRoomLeft: "server.room.left",
  ServerMessageHelloAck: "server.hello.ack",

  ServerMessageInvalidateQuery: "server.invalidateQuery",

  ServerMessagePresenceUpdate: "server.presence.update",
} as const;

export type ServerMessageType = (typeof ServerMessageType)[keyof typeof ServerMessageType];

export type ServerMessageInvalidateQueryData = {
  queryKey: string[];
};

export type ServerMessagePresenceUpdateData = ClientMessagePresenceUpdateData & {
  id: string;
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
    userId: string;
  };
  [ServerMessageType.ServerMessageClientSetNameAck]: {
    name: string;
  };
  [ServerMessageType.ServerMessageRoomJoined]: {
    itemId: string;
  };
  [ServerMessageType.ServerMessageRoomLeft]: {
    itemId: string;
  };
  [ServerMessageType.ServerMessageHelloAck]: {
    serverTime: number;
  };
  [ServerMessageType.ServerMessageInvalidateQuery]: ServerMessageInvalidateQueryData;
  [ServerMessageType.ServerMessagePresenceUpdate]: ServerMessagePresenceUpdateData;
};

export type ServerMessage = {
  [Type in ServerMessageType]: {
    type: Type;
    data: ServerMessageDataMap[Type];
    timestamp: number;
  };
}[ServerMessageType];
