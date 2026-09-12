package realtime

import "encoding/json"

type ClientMessage struct {
	Type      ClientMessageType `json:"type"`
	Data      json.RawMessage   `json:"data,omitempty"`
	Timestamp int64             `json:"timestamp,omitempty"`
}

type ServerMessage struct {
	Type ServerMessageType `json:"type"`
	Data any               `json:"data,omitempty"`

	Timestamp int64 `json:"timestamp,omitempty"`
}

type ClientMessageType string

const (
	// Connection details
	ClientMessageHello ClientMessageType = "client.hello"

	ClientMessageSetName ClientMessageType = "client.setName"

	ClientMessageRoomJoin  ClientMessageType = "client.room.join"
	ClientMessageRoomLeave ClientMessageType = "client.room.leave"

	ClientMessageInvalidateQuery ClientMessageType = "client.invalidateQuery"

	ClientMessagePresenceUpdate ClientMessageType = "client.presence.update"

	ClientMessageChatMessage ClientMessageType = "client.chat.message"
)

type ServerMessageType string

const (
	ServerMessageClientRegisteredAck ServerMessageType = "server.client.register.ack"
	ServerMessageClientHelloAck      ServerMessageType = "server.client.hello.ack"
	ServerMessageClientSetNameAck    ServerMessageType = "server.client.name.ack"

	ServerMessageRoomJoined ServerMessageType = "server.room.joined"
	ServerMessageRoomLeft   ServerMessageType = "server.room.left"
	ServerMessageHelloAck   ServerMessageType = "server.hello.ack"

	ServerMessageInvalidateQuery ServerMessageType = "server.invalidateQuery"

	ServerMessagePresenceUpdate ServerMessageType = "server.presence.update"

	ServerMessageChatMessage ServerMessageType = "server.chat.message"
)

// Client will send a `Hello` message on first join. Associate this ID with the connectionID.
type ClientMessageHelloData struct {
	UserId string `json:"userId"`
	Name   string `json:"name,omitempty"` // if empty, we auto-gen one
}

type ClientMessageSetNameData struct {
	Name string `json:"name"`
}
type ClientMessageRoomJoinData struct {
	ItemId string `json:"itemId"`
}

type ClientMessageInvalidateQueryData struct {
	QueryKey []string `json:"queryKey"`
}

type ClientMessagePresenceUpdateData struct {
	// Keep frontend anchors opaque, including explicit null when a cursor is hidden.
	Cursor json.RawMessage `json:"cursor,omitempty"`
}

type ClientMessageChatMessageData struct {
	Content   string `json:"content"` // opaque string, frontend can parse it as needed
	MessageId string `json:"messageId"`
	ToId      string `json:"toId,omitempty"` // optional, if present, this is a private message to a specific client
}

// only tells you that connection was established
type ServerMessageClientRegisteredAckData struct {
	// ClientInfo BareClient `json:"clientInfo"`
	Ok bool `json:"ok"`
}

type ServerMessageClientHelloAckData struct {
	BareClient
}

type ServerMessageInvalidateQueryData struct {
	QueryKey []string `json:"queryKey"`
}

type RoomJoinedBroadcast struct {
	ItemId string `json:"itemId"`
}

type ServerMessagePresenceUpdateData struct {
	ClientMessagePresenceUpdateData

	BareClient
}

type ServerMessageChatMessageData struct {
	ClientMessageChatMessageData
	FromId string `json:"fromId"`
}

type CursorPoint [2]float64

type CursorData struct {
	Point   CursorPoint `json:"point"`
	Surface string      `json:"surface"` // page | cueList
}

// Flows:
// 1. On page load
// Connect to server (via code) --> [ServerMesageClientRegisteredAct] --> send [ClientMessageHello] --> [ServerMessageHelloAck] --> send [ClientMessageRoomJoin]
