// The Hub is the central place to manage WebTransport connections and broadcast messages.
// There are 3 realtime requirements:
// 1. Cursor position updates
// 2. Chat message system
// 3. Query invalidation

package realtime

import (
	"encoding/json"
	"log"
	"sync"
	"time"
)

type Hub struct {
	mu      sync.RWMutex
	clients map[string]*Client // map of client IDs to Client objects

	clientRooms map[string]string // map of client IDs to room IDs. One client can only be in one room (one client can only be in one ItemId)
	rooms       map[string]*Room  // map of room IDs to their in-memory state
}

type Room struct {
	ID       string
	clients  map[string]*Client // map of client IDs to Client objects
	Messages []json.RawMessage  // opaque chat history for this room
}

// Create a Hub
func NewHub() *Hub {
	return &Hub{
		clients:     make(map[string]*Client),
		clientRooms: make(map[string]string),
		rooms:       make(map[string]*Room),
	}
}

// Register a client in a Hub
func (h *Hub) RegisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[client.connectionId] = client

	log.Printf("Realtime client registered: %s", client.connectionId)
}

// Unregister a client in a Hub, when they leave
func (h *Hub) UnregisterClient(client *Client) {
	h.mu.Lock()
	roomId, wasInRoom := h.clientRooms[client.connectionId]
	if room, ok := h.rooms[roomId]; ok {
		delete(room.clients, client.connectionId)
	}
	delete(h.clients, client.connectionId)
	delete(h.clientRooms, client.connectionId) // remove the client from any room they were in
	h.mu.Unlock()

	if wasInRoom {
		h.broadcastRoomUsers(roomId)
	}
}

// --- Client naming --- --- ---
func (h *Hub) SetClientName(client *Client, name string) {
	h.mu.Lock()
	client.name = name
	roomId, isInRoom := h.clientRooms[client.connectionId]
	h.mu.Unlock()

	log.Printf("Client %s set name to %s", client.connectionId, name)
	if isInRoom {
		h.broadcastRoomUsers(roomId)
	}
}

// --- Room functionality --- --- ---
func (h *Hub) JoinRoom(client *Client, roomJoin ClientMessageRoomJoinData) {
	h.mu.Lock()

	roomId := roomJoin.ItemId

	if currentRoom, ok := h.clientRooms[client.connectionId]; ok && currentRoom == roomId {
		h.mu.Unlock()
		return
	}

	previousRoomId := h.clientRooms[client.connectionId]
	if previousRoom, ok := h.rooms[previousRoomId]; ok {
		delete(previousRoom.clients, client.connectionId)
	}

	room, ok := h.rooms[roomId]
	if !ok {
		room = &Room{
			ID:       roomId,
			clients:  make(map[string]*Client),
			Messages: make([]json.RawMessage, 0),
		}
		h.rooms[roomId] = room
	}

	room.clients[client.connectionId] = client
	h.clientRooms[client.connectionId] = roomId
	h.mu.Unlock()

	log.Printf("Client %s joined room %s", client.connectionId, roomId)

	if previousRoomId != "" {
		h.broadcastRoomUsers(previousRoomId)
	}
	h.broadcastRoomUsers(roomId)

	// Send back to the sender the message history of the room
	client.Send(ServerMessage{
		Type: ServerMessageSyncRoomMessages,
		Data: ServerMessageSyncRoomMessagesData{
			Messages: room.Messages,
		},
		Timestamp: time.Now().UnixMilli(),
	})
}

func (h *Hub) LeaveRoom(client *Client) {
	h.mu.Lock()

	// Remove the client from the room
	roomId, wasInRoom := h.clientRooms[client.connectionId]
	if wasInRoom {
		if room, ok := h.rooms[roomId]; ok {
			delete(room.clients, client.connectionId)
		}
		delete(h.clientRooms, client.connectionId)
	}
	h.mu.Unlock()

	if wasInRoom {
		log.Printf("Client %s left room %s", client.connectionId, roomId)
		h.broadcastRoomUsers(roomId)
	}

}

// Update everyone on the new list of users
func (h *Hub) broadcastRoomUsers(roomId string) {
	h.mu.RLock()
	room, ok := h.rooms[roomId]
	if !ok {
		h.mu.RUnlock()
		return
	}

	recipients := make([]*Client, 0, len(room.clients))
	users := make([]LiveUser, 0, len(room.clients))
	for _, client := range room.clients {
		recipients = append(recipients, client)
		users = append(users, LiveUser{
			UserId:       client.userId,
			ConnectionId: client.connectionId,
			Name:         client.name,
		})
	}
	h.mu.RUnlock()

	message := ServerMessage{
		Type: ServerMessageRoomUsersUpdate,
		Data: ServerMessageRoomUsersUpdateData{
			Users: users,
		},
		Timestamp: time.Now().UnixMilli(),
	}
	for _, client := range recipients {
		if !client.TrySend(message) {
			log.Printf("Unable to queue room users update for client: %s", client.connectionId)
		}
	}

}

// Send a message to the entire room, including the sender
func (h *Hub) BroadcastToRoom(sender *Client, message ServerMessage) {
	h.mu.RLock()

	clientId := sender.connectionId
	roomId, ok := h.clientRooms[clientId]

	if !ok {
		log.Printf("Client %s is not in a room, cannot broadcast to room", clientId)
		h.mu.RUnlock()
		return
	}

	room, ok := h.rooms[roomId]
	if !ok {
		h.mu.RUnlock()
		return
	}

	recipients := make([]*Client, 0, len(room.clients))
	for _, client := range room.clients {
		recipients = append(recipients, client)
	}

	h.mu.RUnlock()

	for _, client := range recipients {
		if !client.TrySend(message) {
			// can't send for some reason
			log.Printf("Unable to queue message for client: %s", client.connectionId)
		}
	}

}

// Send a message to all other clients in the sender's room.
func (h *Hub) SendToRoomPeers(sender *Client, message ServerMessage) {
	h.mu.RLock()

	roomId, ok := h.clientRooms[sender.connectionId]
	if !ok {
		log.Printf("Client %s is not in a room, cannot send to room peers", sender.connectionId)
		h.mu.RUnlock()
		return
	}

	room, ok := h.rooms[roomId]
	if !ok {
		h.mu.RUnlock()
		return
	}

	recipients := make([]*Client, 0, len(room.clients))
	for _, client := range room.clients {
		if client.connectionId != sender.connectionId {
			recipients = append(recipients, client)
		}
	}

	h.mu.RUnlock()

	for _, client := range recipients {
		if !client.TrySend(message) {
			log.Printf("Unable to queue message for client: %s", client.connectionId)
		}
	}
}

// Send a message to all clients, except the sender.
func (h *Hub) Broadcast(sender *Client, message ServerMessage) {
	h.mu.RLock()

	recipients := make([]*Client, 0, len(h.clients)) // just nice to hold all clients

	// don't re-send back to the sender
	for _, client := range h.clients {
		if client.connectionId != sender.connectionId {
			recipients = append(recipients, client)
		}
	}

	h.mu.RUnlock()

	for _, client := range recipients {
		if !client.TrySend(message) {
			// can't send for some reason
			log.Printf("Unable to queue message for client: %s", client.connectionId)
		}
	}

}

func (h *Hub) SaveRoomMessage(sender *Client, message ServerMessageChatMessageData) {
	h.mu.Lock()
	defer h.mu.Unlock()

	roomId, ok := h.clientRooms[sender.connectionId]
	if !ok {
		log.Printf("Client %s is not in a room, cannot save message", sender.connectionId)
		return
	}

	room, ok := h.rooms[roomId]
	if !ok {
		log.Printf("Room %s does not exist, cannot save message", roomId)
		return
	}

	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Failed to marshal chat message: %v", err)
		return
	}

	room.Messages = append(room.Messages, messageBytes)
}
