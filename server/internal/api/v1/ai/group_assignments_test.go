package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"reflect"
	"strings"
	"testing"

	"lighting-cue-maker/server/internal/models"
)

func TestGroupAssignmentsFollowSelectedOrder(t *testing.T) {
	t.Setenv("KEY_JEV", "test-key")
	attribute := models.AttributeConfiguration{
		Uuid: "intensity", Name: "Intensity", Type: models.AttributeTypePresetIntensity,
		Options: models.AttributeTypeOptions{PresetIntensity: []float64{0, 50}},
	}
	req := GenerateCueRequest{
		Cue: &models.Cue{Uuid: "target"},
		FixtureGroups: []models.FixtureGroupConfiguration{
			{Uuid: "a", Name: "A", Attributes: []models.AttributeConfiguration{attribute}},
			{Uuid: "b", Name: "B", Attributes: []models.AttributeConfiguration{attribute}},
			{Uuid: "unsupported", Attributes: []models.AttributeConfiguration{{Type: models.AttributeTypePresetPosition}}},
		},
	}
	original, _ := json.Marshal(req)
	calls := 0
	oldTransport := http.DefaultTransport
	t.Cleanup(func() { http.DefaultTransport = oldTransport })
	http.DefaultTransport = jevTestTransport(func(request *http.Request) (*http.Response, error) {
		var upstream JevRequest
		if err := json.NewDecoder(request.Body).Decode(&upstream); err != nil {
			t.Fatal(err)
		}
		if calls >= 2 || !strings.HasSuffix(upstream.State, []string{"Current group: g1", "Current group: g0"}[calls]) {
			t.Fatalf("wrong generation order: %s", upstream.State)
		}
		if calls == 1 && (!strings.Contains(upstream.State, `"group":"g1"`) || !strings.Contains(upstream.State, `"value":50`)) {
			t.Fatal("completed B settings missing from A request")
		}
		if len(upstream.Questions) != 1 || len(upstream.Questions["a0"].Criteria) != 1 || upstream.Questions["a0"].Criteria["c0"] != "50" {
			t.Fatal("expected one intensity question with individual preset choices")
		}
		calls++
		body := `{"answers":{"a0":{"type":"choice","choice":"c0"}},"usage":{"input_tokens":123,"output_tokens":10}}`
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(body))}, nil
	})
	ids := []string{"b", "unsupported", "a"}
	cue, stats, err := generateCueAssignmentsByGroup(context.Background(), req, "song context", ids)
	if err != nil {
		t.Fatal(err)
	}
	if calls != 2 {
		t.Fatalf("expected 2 requests; unsupported attributes need no request, got %d", calls)
	}
	if stats.TotalInputTokens != 246 || len(stats.Output) != 2 {
		t.Fatalf("expected 246 tokens and two responses, got %#v", stats)
	}
	config, _ := decodeCueObject(cue.CueConfig)
	if !reflect.DeepEqual(config["enabledGroups"], []any{"b", "unsupported", "a"}) {
		t.Fatalf("selected order changed: %s", cue.CueConfig)
	}
	after, _ := json.Marshal(req)
	if !bytes.Equal(original, after) {
		t.Fatal("original request was mutated")
	}
}

func TestGroupPresetChoiceLimit(t *testing.T) {
	t.Setenv("KEY_JEV", "test-key")
	oldTransport := http.DefaultTransport
	t.Cleanup(func() { http.DefaultTransport = oldTransport })
	calls := 0
	http.DefaultTransport = jevTestTransport(func(req *http.Request) (*http.Response, error) {
		calls++
		var upstream JevRequest
		if err := json.NewDecoder(req.Body).Decode(&upstream); err != nil {
			t.Fatal(err)
		}
		if len(upstream.Questions["a0"].Criteria) != 255 {
			t.Fatal("expected 255 options to be accepted")
		}
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(`{"answers":{"a0":{"type":"choice","choice":"c254"}}}`))}, nil
	})
	for _, count := range []int{0, 255, 256} {
		// The limit applies after removing zero; count=0 is the zero-only case.
		options := []float64{0}
		for i := 0; i < count; i++ {
			options = append(options, float64(i+1)/3)
		}
		req := GenerateCueRequest{Cue: &models.Cue{}, FixtureGroups: []models.FixtureGroupConfiguration{
			{Uuid: "a", Attributes: []models.AttributeConfiguration{{Uuid: "intensity", Type: models.AttributeTypePresetIntensity, Options: models.AttributeTypeOptions{PresetIntensity: options}}}},
		}}
		_, _, err := generateCueAssignmentsByGroup(context.Background(), req, "", []string{"a"})
		if (err == nil) != (count == 255) {
			t.Fatalf("unexpected result for %d options: %v", count, err)
		}
	}
	if calls != 1 {
		t.Fatalf("invalid option counts reached Jev: %d requests", calls)
	}
}
