package realtime

const (
	MessageTypeHello    = "hello"
	MessageTypeHelloAck = "hello.ack"
)

type Message struct {
	Type string `json:"type"`
	Data any    `json:"data,omitempty"`
}
