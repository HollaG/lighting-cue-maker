package realtime

import "encoding/json"

type ClientMessage struct {
	Type      ClientMessageType `json:"type"`
	Data      json.RawMessage   `json:"data,omitempty"`
	Timestamp int64             `json:"timestamp,omitempty"`
}

type ServerMessage struct {
	Type      ServerMessageType `json:"type"`
	Data      any               `json:"data,omitempty"`
	Timestamp int64             `json:"timestamp,omitempty"`
}

type ClientMessageType string

const (
	ClientMessageSetName ClientMessageType = "client.setName"

	ClientMessageRoomJoin  ClientMessageType = "client.room.join"
	ClientMessageRoomLeave ClientMessageType = "client.room.leave"

	ClientMessageInvalidateQuery ClientMessageType = "client.invalidateQuery"

	ClientMessagePresenceUpdate ClientMessageType = "client.presence.update"
)

type ServerMessageType string

const (
	ServerMessageClientRegisteredAck ServerMessageType = "server.client.register.ack"
	ServerMessageClientSetNameAck    ServerMessageType = "server.client.name.ack"

	ServerMessageRoomJoined ServerMessageType = "server.room.joined"
	ServerMessageRoomLeft   ServerMessageType = "server.room.left"
	ServerMessageHelloAck   ServerMessageType = "server.hello.ack"

	ServerMessageInvalidateQuery ServerMessageType = "server.invalidateQuery"

	ServerMessagePresenceUpdate ServerMessageType = "server.presence.update"
)

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

type ServerMessageClientRegisteredAckData struct {
	ClientInfo BareClient `json:"clientInfo"`
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

type CursorPoint [2]float64

type CursorData struct {
	Point   CursorPoint `json:"point"`
	Surface string      `json:"surface"` // page | cueList
}
