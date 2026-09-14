// feature[class=Realtime] Client and server message types

import type { ViewMode } from "../../components/Cues/CueCard/ViewModeSelect";
import type { ChatMessageData } from "./chat";
import type { CursorAnchor, CursorSurface } from "./cursors";

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

// Meta information: connection nego, etc
export type ClientMessageHelloData = LiveUser;

// Live Update for data modifications
export type ClientMessageInvalidateQueryData = {
  queryKey: string[];
};

// Cursor & scroll data. Fields will only be sent when changed
export type ClientMessagePresenceUpdateData = {
  // Omitted means unchanged; null hides the cursor. Scroll fields can be added here later.
  cursor?: CursorAnchor | null;

  scroll?: Record<CursorSurface, { x: number; y: number }> | null;
  currentlySelectedCueId?: string | null; // null if user unselected

  viewConfig?: { [cueId: string]: { viewMode: ViewMode; activeFixtureGroupIds: string[] } }; // force a change in view mode for a specific cue
};

// "Live View" data
// Updates each client on who is following who. This is not needed for the own client, but rather to inform others.
export type ClientMessagePresenceFollowData = {
  followedUserId: string | null; // null means unfollow
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
  ServerMessageRoomUsersUpdate: "server.room.users.update",
  ServerMessageRoomLeft: "server.room.left",

  ServerMessageInvalidateQuery: "server.invalidateQuery",

  ServerMessagePresenceUpdate: "server.presence.update",

  ServerMessageChatMessage: "server.chat.message",
  ServerMessageSyncRoomMessagesData: "server.room.messages",
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
  connectionId: string;
  name: string;
};

export type ServerMessageHistory = Partial<Record<ServerMessageType, unknown[]>>;
export type ServerMessageLastMessageMap = Partial<Record<ServerMessageType, unknown>>;
export type ServerMessagePresenceFollowInformation = ClientMessagePresenceFollowData; // followerId -> followingId

// ----------------------

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
    messages: ChatMessageData[];
  };
  [ServerMessageType.ServerMessageRoomUsersUpdate]: {
    users: LiveUser[]; // all users
  };
  [ServerMessageType.ServerMessageRoomLeft]: {
    itemId: string;
  };

  [ServerMessageType.ServerMessageInvalidateQuery]: ServerMessageInvalidateQueryData;
  [ServerMessageType.ServerMessagePresenceUpdate]: ServerMessagePresenceUpdateData;

  [ServerMessageType.ServerMessageChatMessage]: ChatMessageData;
  [ServerMessageType.ServerMessageSyncRoomMessagesData]: {
    messages: ChatMessageData[];
  };
};

export type ServerMessage = {
  [Type in ServerMessageType]: {
    type: Type;
    data: ServerMessageDataMap[Type];
    timestamp: number;
  };
}[ServerMessageType];
