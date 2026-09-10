package realtime

import (
	"crypto/tls"
	"net/http"

	"github.com/quic-go/quic-go"
	"github.com/quic-go/quic-go/http3"
	webtransport "github.com/quic-go/webtransport-go"
)

const applicationProtocol = "lighting-realtime-v1"

// WebTransport server
type Server struct {
	transport *webtransport.Server
	certFile  string
	keyFile   string
	hub       *Hub
}

// Make a server instance and return a pointer to it
func NewServer(
	address string,
	certFile string,
	keyFile string,
	allowedOrigin string,

) *Server {
	mux := http.NewServeMux()

	http3Server := &http3.Server{
		Addr: address,
		QUICConfig: &quic.Config{
			EnableDatagrams: true,
		},
		TLSConfig: http3.ConfigureTLSConfig(&tls.Config{}),
		Handler:   mux,
	}

	// Advertise HTTP3 and WebTransport support
	webtransport.ConfigureHTTP3Server(http3Server)

	transport := &webtransport.Server{
		H3:                   http3Server,
		ApplicationProtocols: []string{applicationProtocol},
		CheckOrigin: func(r *http.Request) bool {
			return r.Header.Get("Origin") == allowedOrigin
		},
	}

	server := &Server{
		transport: transport,
		certFile:  certFile,
		keyFile:   keyFile,
		hub:       NewHub(),
	}

	mux.HandleFunc("/api/v1/realtime", server.handleConnect)
	return server
}

func (s *Server) ListenAndServe() error {
	return s.transport.ListenAndServeTLS(s.certFile, s.keyFile)
}

func (s *Server) Close() error {
	return s.transport.Close()
}
