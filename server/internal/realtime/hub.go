// The Hub is the central place to manage WebTransport connections and broadcast messages.
// There are 3 realtime requirements:
// 1. Cursor position updates
// 2. Chat message system
// 3. Query invalidation

package realtime

import (
	"log"
	"sync"
)

type Hub struct {
	mu      sync.RWMutex
	clients map[string]*Client // map of client IDs to Client objects

	clientRooms map[string]string // map of client IDs to room IDs. One client can only be in one room (one client can only be in one ItemId)
}

type Room struct {
	ID      string
	clients map[string]*Client // map of client IDs to Client objects
}

// Create a Hub
func NewHub() *Hub {
	return &Hub{
		clients:     make(map[string]*Client),
		clientRooms: make(map[string]string),
	}
}

// Register a client in a Hub
func (h *Hub) RegisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[client.id] = client

	log.Printf("Realtime client registered: %s", client.id)
}

// Unregister a client in a Hub, when they leave
func (h *Hub) UnregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients, client.id)
	delete(h.clientRooms, client.id) // remove the client from any room they were in
}

// --- Client naming --- --- ---
func (h *Hub) SetClientName(client *Client, name string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	client.name = name
	log.Printf("Client %s set name to %s", client.id, name)
}

// --- Room functionality --- --- ---
func (h *Hub) JoinRoom(client *Client, roomJoin ClientMessageRoomJoinData) {
	h.mu.Lock()
	defer h.mu.Unlock()

	roomId := roomJoin.ItemId

	if currentRoom, ok := h.clientRooms[client.id]; ok && currentRoom == roomId {
		return
	}

	// else, join the new room
	h.clientRooms[client.id] = roomId
	log.Printf("Client %s joined room %s", client.id, roomId)
}

func (h *Hub) LeaveRoom(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Remove the client from the room
	if roomId, ok := h.clientRooms[client.id]; ok {
		delete(h.clientRooms, client.id)
		log.Printf("Client %s left room %s", client.id, roomId)
	}

}

// Send a message to the entire room, including the sender
func (h *Hub) BroadcastToRoom(sender *Client, message ServerMessage) {
	h.mu.RLock()

	recipients := make([]*Client, 0, len(h.clients)) // just nice to hold all clients

	clientId := sender.id
	roomId, ok := h.clientRooms[clientId]

	if !ok {
		log.Printf("Client %s is not in a room, cannot broadcast to room", clientId)
		h.mu.RUnlock()
		return
	}

	// find the clients in this room
	for _, client := range h.clients {
		clientId := client.id

		// only keep the clients that are in the same room as the sender
		if clientRoomId, ok := h.clientRooms[clientId]; ok && clientRoomId == roomId {
			recipients = append(recipients, client)
		}
	}

	h.mu.RUnlock()

	for _, client := range recipients {
		if !client.TrySend(message) {
			// can't send for some reason
			log.Printf("Unable to queue message for client: %s", client.id)
		}
	}

}

// Send a message to all other clients in the sender's room.
func (h *Hub) SendToRoomPeers(sender *Client, message ServerMessage) {
	h.mu.RLock()

	recipients := make([]*Client, 0, len(h.clients))

	roomId, ok := h.clientRooms[sender.id]
	if !ok {
		log.Printf("Client %s is not in a room, cannot send to room peers", sender.id)
		h.mu.RUnlock()
		return
	}

	for _, client := range h.clients {
		clientRoomId, isInRoom := h.clientRooms[client.id]
		if isInRoom && clientRoomId == roomId && client.id != sender.id {
			recipients = append(recipients, client)
		}
	}

	h.mu.RUnlock()

	for _, client := range recipients {
		if !client.TrySend(message) {
			log.Printf("Unable to queue message for client: %s", client.id)
		}
	}
}

// Send a message to all clients, except the sender.
func (h *Hub) Broadcast(sender *Client, message ServerMessage) {
	h.mu.RLock()

	recipients := make([]*Client, 0, len(h.clients)) // just nice to hold all clients

	// don't re-send back to the sender
	for _, client := range h.clients {
		if client.id != sender.id {
			recipients = append(recipients, client)
		}
	}

	h.mu.RUnlock()

	for _, client := range recipients {
		if !client.TrySend(message) {
			// can't send for some reason
			log.Printf("Unable to queue message for client: %s", client.id)
		}
	}

}
