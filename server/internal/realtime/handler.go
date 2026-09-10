package realtime

import (
	"log"
	"net/http"
)

// on connection
func (s *Server) handleConnect(w http.ResponseWriter, r *http.Request) {
	session, err := s.transport.Upgrade(w, r)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		http.Error(w, "Failed to upgrade connection", http.StatusBadRequest)
		return
	}

	log.Printf("New WebTransport session established: %v with protocol %q", session.RemoteAddr(), session.SessionState().ApplicationProtocol)

	if err := handleSession(session, s.hub); err != nil {
		log.Printf("WebTransport session failed: %v", err)
		_ = session.CloseWithError(1, "session failed")
		return
	}
	_ = session.CloseWithError(0, "")
	log.Printf("WebTransport session closed: %v", session.RemoteAddr())
}
