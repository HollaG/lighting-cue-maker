package realtime

import "encoding/json"

type ClientMessage struct {
	Type ClientMessageType `json:"type"`
	Data json.RawMessage   `json:"data,omitempty"`
}

type ServerMessage struct {
	Type ServerMessageType `json:"type"`
	Data any               `json:"data,omitempty"`
}

type ClientMessageType string

const (
	ClientMessageSetName ClientMessageType = "client.setName"

	ClientMessageRoomJoin  ClientMessageType = "client.room.join"
	ClientMessageRoomLeave ClientMessageType = "client.room.leave"

	ClientMessageInvalidateQuery ClientMessageType = "client.invalidateQuery"
)

type ServerMessageType string

const (
	ServerMessageClientRegisteredAck ServerMessageType = "server.client.register.ack"
	ServerMessageClientSetNameAck    ServerMessageType = "server.client.name.ack"

	ServerMessageRoomJoined ServerMessageType = "server.room.joined"
	ServerMessageRoomLeft   ServerMessageType = "server.room.left"
	ServerMessageHelloAck   ServerMessageType = "server.hello.ack"

	ServerMessageInvalidateQuery ServerMessageType = "server.invalidateQuery"
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

type ServerMessageClientRegisteredAckData struct {
	ClientInfo BareClient `json:"clientInfo"`
}

type ServerMessageInvalidateQueryData struct {
	QueryKey []string `json:"queryKey"`
}

type RoomJoinedBroadcast struct {
	ItemId string `json:"itemId"`
}

type CursorData struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}
