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
		visualiser.DefaultViewport != nil ||
		string(visualiser.Objects2D) != "[]" ||
		visualiser.Config3D != nil ||
		visualiser.DefaultCameraView != nil ||
		string(visualiser.Objects3D) != "[]" ||
		string(visualiser.FixtureAttributeMapping) != "{}" {
		t.Fatalf("unexpected default visualiser: %#v", visualiser)
	}
}

func TestIsJSONObject(t *testing.T) {
	tests := []struct {
		name  string
		value string
		want  bool
	}{
		{name: "empty object", value: `{}`, want: true},
		{name: "nested object", value: `{"group":{"position":{}}}`, want: true},
		{name: "array", value: `[]`, want: false},
		{name: "null", value: `null`, want: false},
		{name: "invalid", value: `{`, want: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := isJSONObject(datatypes.JSON(test.value)); got != test.want {
				t.Fatalf("isJSONObject(%q) = %v, want %v", test.value, got, test.want)
			}
		})
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
		ID:                      "existing-visualiser",
		EventID:                 "event-id",
		DefaultViewport:         datatypes.JSON(`{"x":10,"y":20,"width":600,"height":400}`),
		Objects2D:               datatypes.JSON(`[{"type":"fixture"}]`),
		Config3D:                datatypes.JSON(`{"haze":0.5,"ambientLight":0.1}`),
		DefaultCameraView:       datatypes.JSON(`{"position":[0,2,5],"target":[0,1,0],"fov":70}`),
		Objects3D:               datatypes.JSON(`[{"type":"cuboid"}]`),
		FixtureAttributeMapping: datatypes.JSON(`{"group-id":{"PRESET_POSITION":{}}}`),
	}

	savedVisualiser := visualiserFromRequest(req)

	if savedVisualiser.Uuid != "" {
		t.Fatalf("new visualiser must not copy request ID, got %q", savedVisualiser.Uuid)
	}
	if savedVisualiser.LightEventUuid != req.EventID ||
		string(savedVisualiser.DefaultViewport) != string(req.DefaultViewport) ||
		string(savedVisualiser.Objects2D) != string(req.Objects2D) ||
		string(savedVisualiser.Config3D) != string(req.Config3D) ||
		string(savedVisualiser.DefaultCameraView) != string(req.DefaultCameraView) ||
		string(savedVisualiser.Objects3D) != string(req.Objects3D) ||
		string(savedVisualiser.FixtureAttributeMapping) != string(req.FixtureAttributeMapping) {
		t.Fatalf("visualiser fields were not mapped correctly: %#v", savedVisualiser)
	}
}

func TestVisualiserFromRequestDefaultsObjects3D(t *testing.T) {
	visualiser := visualiserFromRequest(models.UpsertVisualiserReq{})

	if string(visualiser.Objects3D) != "[]" {
		t.Fatalf("expected Objects3D to default to [], got %q", visualiser.Objects3D)
	}
}
