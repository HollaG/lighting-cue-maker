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
  data: unknown;
};

export type ServerMessage = {
  type: ServerMessageType;
  data: unknown;
};
