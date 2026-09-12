// Test file to prove message passing works.

package realtime

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/rand/v2"

	"github.com/google/uuid"
	webtransport "github.com/quic-go/webtransport-go"
)

var anonymousAnimals = []string{
	"Badger",
	"Beaver",
	"Capybara",
	"Fox",
	"Koala",
	"Otter",
	"Panda",
	"Penguin",
	"Raccoon",
	"Tiger",
	"Turtle",
	"Wombat",
}

// Represents a web client / user.
type Client struct {
	userId       string
	connectionId string
	name         string
	session      *webtransport.Session
	stream       *webtransport.Stream
	hub          *Hub

	send chan ServerMessage // message channel for sending

	ctx    context.Context
	cancel context.CancelFunc
}

// The bare information that the Web client needs to know
type BareClient struct {
	UserId       string `json:"userId"`
	ConnectionId string `json:"connectionId"`
	Name         string `json:"name"`
}

func newClient(session *webtransport.Session, hub *Hub) (*Client, error) {
	// Wait until the browser opens a bidirectional stream.
	stream, err := session.AcceptStream(session.Context())

	if err != nil {
		return nil, fmt.Errorf("accepting control stream: %w", err)
	}

	ctx, cancel := context.WithCancel(session.Context())

	return &Client{
		connectionId: uuid.NewString(),
		session:      session,
		stream:       stream,
		hub:          hub,
		send:         make(chan ServerMessage, 16), // buffered channel for sending messages
		ctx:          ctx,
		cancel:       cancel,
		name:         randomAnonymousName(),
	}, nil

}

func randomAnonymousName() string {
	return "Anonymous " + anonymousAnimals[rand.IntN(len(anonymousAnimals))]
}

func (c *Client) Run() error {
	// register the client, deregister after return
	c.hub.RegisterClient(c)
	defer c.hub.UnregisterClient(c)

	errs := make(chan error, 2)

	// send the client an acknowledgement message that involves the user's name (if not sent)
	// c.Send(ServerMessage{
	// 	Type: ServerMessageClientRegisteredAck,
	// 	Data: ServerMessageClientRegisteredAckData{
	// 		Ok: true,
	// 	},
	// })

	// go routine, make an 'errs' channel
	go func() {
		errs <- c.readLoop()
	}()

	go func() {
		errs <- c.writeLoop()
	}()

	err := <-errs // when a loop returns, means the client is done / errors. Write the errors to err
	c.cancel()

	_ = c.stream.Close()

	// wait for the other loop to finish
	<-errs

	return err

}

func (c *Client) Send(message ServerMessage) error {
	select {
	case c.send <- message:
		return nil
	case <-c.ctx.Done():
		return c.ctx.Err()

	}
}

func (c *Client) TrySend(message ServerMessage) bool {
	select {
	case c.send <- message:
		return true
	case <-c.ctx.Done():
		return false
	default:
		return false
	}

}

// This is like the "handler"
func (c *Client) readLoop() error {
	decoder := json.NewDecoder(c.stream)

	for {
		var message ClientMessage

		if err := decoder.Decode(&message); err != nil {
			if errors.Is(err, io.EOF) || c.ctx.Err() != nil {
				return nil
			}
			return fmt.Errorf("reading control message: %w", err)

		}

		timestamp := message.Timestamp

		switch message.Type { // decide what to do basd on the incoming message type
		case ClientMessageHello:
			data, err := decodeMessageData[ClientMessageHelloData](message.Data)
			if err != nil || data.UserId == "" {
				log.Printf("Error decoding hello message data: %v", err)
				continue
			}

			// assign the user ID and name, if present
			userId := data.UserId
			name := data.Name
			if name == "" {
				name = randomAnonymousName()
			}

			c.userId = userId
			c.name = name

			// reply with an acknowledgement message
			c.Send(ServerMessage{
				Type: ServerMessageHelloAck,
				Data: ServerMessageClientHelloAckData{
					BareClient: BareClient{
						ConnectionId: c.connectionId,
						UserId:       c.userId,
						Name:         c.name,
					},
				},
				Timestamp: timestamp,
			})

			continue

		case ClientMessageRoomJoin: // User emit room join event
			data, err := decodeMessageData[ClientMessageRoomJoinData](message.Data)
			if err != nil || data.ItemId == "" {
				continue
			}

			c.hub.JoinRoom(c, data)
		case ClientMessageSetName: // User emit set own name event
			data, err := decodeMessageData[ClientMessageSetNameData](message.Data)
			if err != nil || data.Name == "" {
				continue
			}

			c.hub.SetClientName(c, data.Name)

			// case ClientMessageRoomLeave: // User emit room leave event
			// 	c.hub.LeaveRoom(c)

		case ClientMessageInvalidateQuery: // User emit invalidate query event
			// simply forward it to the hub to broadcast
			data, err := decodeMessageData[ClientMessageInvalidateQueryData](message.Data)
			if err != nil || len(data.QueryKey) == 0 {
				continue
			}
			log.Printf("Client %s sent invalidate query for key: %v", c.connectionId, data.QueryKey)
			// forward it along to the clients
			c.hub.SendToRoomPeers(c, ServerMessage{
				Type: ServerMessageInvalidateQuery,
				Data: ServerMessageInvalidateQueryData{
					QueryKey: data.QueryKey,
				},
				Timestamp: timestamp,
			})

		case ClientMessagePresenceUpdate: // User emit presence update event
			data, err := decodeMessageData[ClientMessagePresenceUpdateData](message.Data)

			if err != nil {
				log.Printf("Error decoding presence update data: %v", err)
				continue
			}

			// add the client's ID and name to the presence update data
			presenceUpdateData := ServerMessagePresenceUpdateData{
				ClientMessagePresenceUpdateData: data,
				BareClient: BareClient{
					UserId: c.userId,
					Name:   c.name,
				},
			}

			// forward it along to the clients
			c.hub.SendToRoomPeers(c, ServerMessage{
				Type:      ServerMessagePresenceUpdate,
				Data:      presenceUpdateData,
				Timestamp: timestamp,
			})

		case ClientMessageChatMessage: // User emit chat message event
			data, err := decodeMessageData[ClientMessageChatMessageData](message.Data)

			if err != nil || data.Content == "" || data.MessageId == "" {
				log.Printf("Error decoding chat message data: %v", err) // don't send empty messages
				continue
			}

			// add the client ID
			chatMessageData := ServerMessageChatMessageData{
				ClientMessageChatMessageData: data,
				FromId:                       c.connectionId,
			}

			// forward it along to the clients
			c.hub.SendToRoomPeers(c, ServerMessage{
				Type:      ServerMessageChatMessage,
				Data:      chatMessageData,
				Timestamp: timestamp,
			})
		}

	}
}

func (c *Client) writeLoop() error {
	encoder := json.NewEncoder(c.stream)

	for {
		select {
		case message := <-c.send:
			if err := encoder.Encode(message); err != nil {
				return fmt.Errorf("writing control message: %w", err)
			}

		case <-c.ctx.Done():
			return nil
		}
	}
}

func handleSession(session *webtransport.Session, hub *Hub) error {
	client, err := newClient(session, hub)
	if err != nil {
		return err
	}

	return client.Run()
}

func decodeMessageData[T any](data any) (T, error) {
	var result T

	raw, err := json.Marshal(data)
	if err != nil {
		return result, err
	}

	err = json.Unmarshal(raw, &result)
	return result, err
}
