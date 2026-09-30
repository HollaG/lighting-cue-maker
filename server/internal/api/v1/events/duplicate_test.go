package events

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

func TestDuplicateEventRejectsInvalidRequests(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	Register(router.Group("/api/v1/events"))

	for _, body := range []string{"", "{", "null", `{}`, `{"eventId":null}`, `{"eventId":123}`, `{"eventId":""}`, `{"eventId":"invalid"}`} {
		t.Run(body, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodPost, "/api/v1/events/duplicate", strings.NewReader(body))
			request.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(recorder, request)
			if recorder.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, body = %s", recorder.Code, recorder.Body)
			}
			var response struct {
				Success bool   `json:"success"`
				Error   string `json:"error"`
			}
			if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
				t.Fatal(err)
			}
			if response.Success || response.Error == "" {
				t.Fatalf("expected shared error envelope, got %s", recorder.Body)
			}
		})
	}
}

func TestRemapFixtureAttributeMapping(t *testing.T) {
	const source = `{"old-group":{"presetPosition":{"position-id":{"old-fixture":{"pan":0,"tilt":-45,"extension":9007199254740993},"deleted-fixture":{"pan":90}}},"extension":{"value":9007199254740993}},"deleted-group":{"presetPosition":{"position-id":{"old-fixture":{"pan":10}}}}}`
	raw := datatypes.JSON(source)
	got, err := remapFixtureAttributeMapping(raw,
		map[string]string{"old-group": "new-group"},
		map[string]string{"old-fixture": "new-fixture"},
	)
	if err != nil {
		t.Fatal(err)
	}
	const want = `{"new-group":{"extension":{"value":9007199254740993},"presetPosition":{"position-id":{"new-fixture":{"pan":0,"tilt":-45,"extension":9007199254740993}}}}}`
	if string(got) != want {
		t.Fatalf("mapping = %s, want %s", got, want)
	}
	if string(raw) != source {
		t.Fatal("source mapping was modified")
	}
}

func TestRemapFixtureAttributeMappingEmptyAndInvalid(t *testing.T) {
	for _, raw := range []string{"", "null", "{}"} {
		got, err := remapFixtureAttributeMapping(datatypes.JSON(raw), nil, nil)
		if err != nil || string(got) != raw {
			t.Fatalf("empty mapping %q: got %q, error %v", raw, got, err)
		}
	}
	for _, raw := range []string{"{", "[]", `{"group":[]}`, `{"group":{"presetPosition":[]}}`, `{"group":{"presetPosition":{"position":42}}}`} {
		_, err := remapFixtureAttributeMapping(datatypes.JSON(raw), map[string]string{"group": "new-group"}, nil)
		if err == nil {
			t.Fatalf("expected malformed mapping %q to fail", raw)
		}
	}
}
