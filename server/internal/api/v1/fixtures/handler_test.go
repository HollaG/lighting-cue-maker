package fixtures

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"lighting-cue-maker/server/internal/models"

	"github.com/gin-gonic/gin"
)

func TestGetFixturesRequiresFixtureGroupOrEventID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/v1/fixtures", nil)

	getFixtures(context)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, recorder.Code)
	}
}

func TestDeleteFixtureRequiresFixtureID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodDelete, "/api/v1/fixtures", nil)

	deleteFixture(context)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, recorder.Code)
	}
}

func TestFixtureFromRequest(t *testing.T) {
	posX, posY, posZ := 1.0, 2.0, 3.0
	rotX, rotY, rotZ := 4.0, 5.0, 6.0
	maxBrightness := 75.0
	req := models.UpsertFixtureReq{
		ID:            "existing-fixture",
		Name:          "Stage left PAR",
		Type:          "par",
		PosX:          &posX,
		PosY:          &posY,
		PosZ:          &posZ,
		RotX:          &rotX,
		RotY:          &rotY,
		RotZ:          &rotZ,
		BeamAngle:     25,
		MaxBrightness: &maxBrightness,
	}

	fixture := fixtureFromRequest(req, "fixture-group")

	if fixture.Uuid != "" {
		t.Fatalf("new fixture must not copy request ID, got %q", fixture.Uuid)
	}
	if fixture.FixtureGroupConfigurationUuid != "fixture-group" || fixture.Name != req.Name || fixture.Type != req.Type {
		t.Fatalf("fixture identity fields were not mapped correctly: %#v", fixture)
	}
	if fixture.PosX != *req.PosX || fixture.PosY != *req.PosY || fixture.PosZ != *req.PosZ ||
		fixture.RotX != *req.RotX || fixture.RotY != *req.RotY || fixture.RotZ != *req.RotZ ||
		fixture.BeamAngle != req.BeamAngle || fixture.MaxBrightness != maxBrightness {
		t.Fatalf("fixture transform fields were not mapped correctly: %#v", fixture)
	}
}

func TestFixtureFromRequestDefaultsMaxBrightness(t *testing.T) {
	fixture := fixtureFromRequest(models.UpsertFixtureReq{}, "fixture-group")

	if fixture.MaxBrightness != 100 {
		t.Fatalf("expected default max brightness 100, got %v", fixture.MaxBrightness)
	}
}

func TestApplyFixtureTransform(t *testing.T) {
	tests := []struct {
		name string
		body string
		want [6]float64
	}{
		{"explicit zeros", `{"posX":0,"posY":0,"posZ":0,"rotX":0,"rotY":0,"rotZ":0}`, [6]float64{}},
		{"omitted fields", `{}`, [6]float64{1, 2, 3, 4, 5, 6}},
		{"partial update", `{"posX":0,"rotY":0}`, [6]float64{0, 2, 3, 4, 0, 6}},
		{"nonzero values", `{"posX":-1,"posY":-2,"posZ":-3,"rotX":-4,"rotY":-5,"rotZ":-6}`, [6]float64{-1, -2, -3, -4, -5, -6}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req models.UpsertFixtureReq
			if err := json.Unmarshal([]byte(tt.body), &req); err != nil {
				t.Fatal(err)
			}
			fixture := models.Fixture{PosX: 1, PosY: 2, PosZ: 3, RotX: 4, RotY: 5, RotZ: 6}
			applyFixtureTransform(&fixture, req)
			got := [6]float64{fixture.PosX, fixture.PosY, fixture.PosZ, fixture.RotX, fixture.RotY, fixture.RotZ}
			if got != tt.want {
				t.Fatalf("expected transform %v, got %v", tt.want, got)
			}
		})
	}
}
