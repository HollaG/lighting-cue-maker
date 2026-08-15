package fixtures

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"lighting-cue-maker/server/internal/models"

	"github.com/gin-gonic/gin"
)

func TestGetFixturesRequiresFixtureGroupID(t *testing.T) {
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
	req := models.UpsertFixtureReq{
		ID:        "existing-fixture",
		Name:      "Stage left PAR",
		Type:      "par",
		PosX:      1,
		PosY:      2,
		PosZ:      3,
		RotX:      4,
		RotY:      5,
		RotZ:      6,
		BeamAngle: 25,
	}

	fixture := fixtureFromRequest(req, "fixture-group")

	if fixture.Uuid != "" {
		t.Fatalf("new fixture must not copy request ID, got %q", fixture.Uuid)
	}
	if fixture.FixtureGroupUuid != "fixture-group" || fixture.Name != req.Name || fixture.Type != req.Type {
		t.Fatalf("fixture identity fields were not mapped correctly: %#v", fixture)
	}
	if fixture.PosX != req.PosX || fixture.PosY != req.PosY || fixture.PosZ != req.PosZ ||
		fixture.RotX != req.RotX || fixture.RotY != req.RotY || fixture.RotZ != req.RotZ ||
		fixture.BeamAngle != req.BeamAngle {
		t.Fatalf("fixture transform fields were not mapped correctly: %#v", fixture)
	}
}
