// Test file to prove message passing works.

package realtime

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"

	webtransport "github.com/quic-go/webtransport-go"
)

func handleSession(session *webtransport.Session) error {
	// Wait until the browser opens a bidirectional stream.
	stream, err := session.AcceptStream(session.Context())
	if err != nil {
		return fmt.Errorf("accepting control stream: %w", err)
	}
	defer stream.Close()

	decoder := json.NewDecoder(stream)
	encoder := json.NewEncoder(stream)

	for {
		var message Message

		// Wait until the browser sends the next JSON message.
		if err := decoder.Decode(&message); err != nil {
			if errors.Is(err, io.EOF) || session.Context().Err() != nil {
				return nil
			}

			return fmt.Errorf("reading control message: %w", err)
		}

		log.Printf("Received realtime message: %s", message.Type)

		switch message.Type {
		case MessageTypeHello:
			err := encoder.Encode(Message{
				Type: MessageTypeHelloAck,
				Data: map[string]string{
					"message": "Hello from the Go server",
				},
			})
			if err != nil {
				return fmt.Errorf("sending hello response: %w", err)
			}

		default:
			log.Printf("Unknown realtime message type: %s", message.Type)
		}
	}
}
