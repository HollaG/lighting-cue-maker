package visualiser

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"lighting-cue-maker/server/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

func TestGetOrCreateVisualiserRequiresEventID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodPut, "/api/v1/visualiser", nil)

	getOrCreateVisualiser(context)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, recorder.Code)
	}
}

func TestDefaultVisualiser(t *testing.T) {
	visualiser := defaultVisualiser("event-id")

	if visualiser.LightEventUuid != "event-id" ||
		visualiser.CanvasWidth != 700 ||
		visualiser.CanvasHeight != 500 ||
		string(visualiser.Objects2D) != "[]" {
		t.Fatalf("unexpected default visualiser: %#v", visualiser)
	}
}

func TestIsJSONArray(t *testing.T) {
	tests := []struct {
		name  string
		value string
		want  bool
	}{
		{name: "empty array", value: `[]`, want: true},
		{name: "mixed array", value: `[{}, 1, "light", null]`, want: true},
		{name: "object", value: `{}`, want: false},
		{name: "null", value: `null`, want: false},
		{name: "invalid", value: `[`, want: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := isJSONArray(datatypes.JSON(test.value)); got != test.want {
				t.Fatalf("isJSONArray(%q) = %v, want %v", test.value, got, test.want)
			}
		})
	}
}

func TestVisualiserFromRequest(t *testing.T) {
	req := models.UpsertVisualiserReq{
		ID:           "existing-visualiser",
		EventID:      "event-id",
		CanvasWidth:  1200,
		CanvasHeight: 800,
		Objects2D:    datatypes.JSON(`[{"type":"fixture"}]`),
	}

	savedVisualiser := visualiserFromRequest(req)

	if savedVisualiser.Uuid != "" {
		t.Fatalf("new visualiser must not copy request ID, got %q", savedVisualiser.Uuid)
	}
	if savedVisualiser.LightEventUuid != req.EventID ||
		savedVisualiser.CanvasWidth != req.CanvasWidth ||
		savedVisualiser.CanvasHeight != req.CanvasHeight ||
		string(savedVisualiser.Objects2D) != string(req.Objects2D) {
		t.Fatalf("visualiser fields were not mapped correctly: %#v", savedVisualiser)
	}
}
