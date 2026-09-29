package ai

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"lighting-cue-maker/server/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

type jevTestTransport func(*http.Request) (*http.Response, error)

func (transport jevTestTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	return transport(req)
}

func TestGenerateCueAssignments(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, invalidStep := range []int{0, 1, 2, 3} {
		name := "success"
		if invalidStep > 0 {
			name = []string{"", "invalid groups", "invalid first group", "missing second group answer"}[invalidStep]
		}
		t.Run(name, func(t *testing.T) {
			t.Setenv("KEY_JEV", "test-key")
			white := models.ColourOption{Hex: "#ffffff", Name: "White"}
			amber := models.ColourOption{Hex: "#ffbf00", Name: "Amber"}
			blue := models.ColourOption{Hex: "#0000ff", Name: "Blue"}
			groups := []models.FixtureGroupConfiguration{
				{Uuid: "a", Name: "A", Attributes: []models.AttributeConfiguration{
					{Uuid: "colour-a", Name: "Colour", Type: models.AttributeTypePresetColour, Options: models.AttributeTypeOptions{PresetColour: []models.ColourOption{white, amber}}},
					{Uuid: "intensity-a", Name: "Intensity", Type: models.AttributeTypePresetIntensity, Options: models.AttributeTypeOptions{PresetIntensity: []float64{0, 50, 100}}},
					{Uuid: "position-a", Type: models.AttributeTypePresetPosition},
				}},
				{Uuid: "b", Name: "B", Attributes: []models.AttributeConfiguration{
					{Uuid: "colour-b", Name: "Colour", Type: models.AttributeTypePresetColour, Options: models.AttributeTypeOptions{PresetColour: []models.ColourOption{white, amber, blue}}},
					{Uuid: "intensity-b", Name: "Intensity", Type: models.AttributeTypePresetIntensity, Options: models.AttributeTypeOptions{PresetIntensity: []float64{0, 75}}},
				}},
				// An unselected group with no options must not participate.
				{Uuid: "disabled", Attributes: []models.AttributeConfiguration{{Uuid: "unused", Type: models.AttributeTypePresetColour}}},
			}
			cue := models.Cue{
				Uuid: "target", Comments: "Keep the solo focused",
				Assignments: datatypes.JSON(`{"a":{"name":"Old A","assignment":{"position-a":{"name":"Position","type":"presetPosition","value":{"presetPosition":{"id":"solo","name":"Solo"}}}}},"disabled":{"name":"Disabled","assignment":{}},"extension":9007199254740993}`),
				CueConfig:   datatypes.JSON(`{"mode":"unknown","extension":{"keep":true}}`),
				Transition:  datatypes.JSON(`{"holdTimeMs":-1,"transitionTimeMs":250}`),
			}
			request := GenerateCueRequest{Cue: &cue, Lyrics: "[Verse]\n{cueId=target=cueId}Example", FixtureGroups: groups}
			original, err := json.Marshal(request)
			if err != nil {
				t.Fatal(err)
			}
			calls := 0
			oldTransport := http.DefaultTransport
			t.Cleanup(func() { http.DefaultTransport = oldTransport })
			http.DefaultTransport = jevTestTransport(func(req *http.Request) (*http.Response, error) {
				if calls >= 3 {
					t.Fatal("unexpected additional Jev request")
				}
				var upstream JevRequest
				if err := json.NewDecoder(req.Body).Decode(&upstream); err != nil {
					t.Fatal(err)
				}
				for _, excluded := range []string{`"createdAt"`, `"updatedAt"`, `"deletedAt"`, `"metadata"`, `"optionPossibleValues"`, "colour-a", "intensity-a", "position-a", `"extension"`} {
					if strings.Contains(upstream.State, excluded) {
						t.Fatalf("unneeded field sent to Jev: %s", excluded)
					}
				}
				answers := make(map[string]JevAnswer)
				if calls == 0 {
					if len(upstream.Questions) != 1 {
						t.Fatalf("unexpected step 1 questions: %#v", upstream.Questions)
					}
					for key, value := range upstream.Questions["fixtureGroups"].Criteria {
						if value == `["g0","g1"]` {
							answers["fixtureGroups"] = JevAnswer{Type: "choice", Choice: key}
						}
					}
					if len(answers) == 0 {
						t.Fatal("expected group combination is missing")
					}
				} else {
					if len(upstream.Questions) != 2 {
						t.Fatalf("expected both attributes in one request, got %#v", upstream.Questions)
					}
					for _, value := range upstream.Questions["a1"].Criteria {
						if value == "0" {
							t.Fatal("zero intensity must not be offered to Jev")
						}
					}
					if calls == 1 {
						if !strings.HasSuffix(upstream.State, "Current group: g0") || len(upstream.Questions["a0"].Criteria) != 2 || len(upstream.Questions["a1"].Criteria) != 2 {
							t.Fatal("incorrect first group or preset options")
						}
						answers["a0"] = JevAnswer{Type: "choice", Choice: "c1"}
						answers["a1"] = JevAnswer{Type: "choice", Choice: "c0"}
					} else {
						if !strings.HasSuffix(upstream.State, "Current group: g1") || len(upstream.Questions["a0"].Criteria) != 3 || len(upstream.Questions["a1"].Criteria) != 1 {
							t.Fatal("incorrect second group or preset options")
						}
						if !strings.Contains(upstream.State, "Completed group settings:") || !strings.Contains(upstream.State, amber.Hex) || !strings.Contains(upstream.State, `"value":50`) {
							t.Fatal("first group's colour and intensity were not carried forward")
						}
						answers["a0"] = JevAnswer{Type: "choice", Choice: "c2"}
						answers["a1"] = JevAnswer{Type: "choice", Choice: "c0"}
					}
				}
				calls++
				if calls == invalidStep {
					switch calls {
					case 1:
						answers["fixtureGroups"] = JevAnswer{Type: "choice", Choice: "invalid"}
					case 2:
						answers["a0"] = JevAnswer{Type: "choice", Choice: "invalid"}
					case 3:
						delete(answers, "a1")
					}
				}
				body, _ := json.Marshal(map[string]any{
					"model": "test-model", "answers": answers,
					"usage":     JevUsage{InputTokens: calls * 100, OutputTokens: 25},
					"requestId": calls, // An upstream field outside our typed response must survive.
				})
				return &http.Response{StatusCode: http.StatusOK, Status: "200 OK", Body: io.NopCloser(bytes.NewReader(body))}, nil
			})
			recorder := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(recorder)
			ctx.Request = httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(original))
			ctx.Request.Header.Set("Content-Type", "application/json")
			generateCue(ctx)
			if invalidStep > 0 {
				if recorder.Code != http.StatusInternalServerError || calls != invalidStep {
					t.Fatalf("invalid answer was not rejected: status %d, calls %d", recorder.Code, calls)
				}
				return
			}
			if recorder.Code != http.StatusOK || calls != 3 {
				t.Fatalf("generation failed: %s (calls %d)", recorder.Body.String(), calls)
			}
			var result struct {
				Success bool `json:"success"`
				Data    struct {
					Cue   models.Cue `json:"cue"`
					Stats struct {
						TotalInputTokens int               `json:"totalInputTokens"`
						Output           []json.RawMessage `json:"output"`
					} `json:"stats"`
				} `json:"data"`
			}
			if err := json.Unmarshal(recorder.Body.Bytes(), &result); err != nil {
				t.Fatal(err)
			}
			if result.Data.Stats.TotalInputTokens != 600 {
				t.Fatalf("expected 100 + 200 + 300 input tokens, got %d", result.Data.Stats.TotalInputTokens)
			}
			if len(result.Data.Stats.Output) != 3 {
				t.Fatalf("expected all 3 model responses, got %d", len(result.Data.Stats.Output))
			}
			for i, raw := range result.Data.Stats.Output {
				var output struct {
					JevResponse
					RequestID int `json:"requestId"`
				}
				if err := json.Unmarshal(raw, &output); err != nil {
					t.Fatal(err)
				}
				if output.RequestID != i+1 || output.Model != "test-model" || output.Usage.InputTokens != (i+1)*100 || output.Usage.OutputTokens != 25 {
					t.Fatalf("response fields or call order were lost: %s", raw)
				}
				if (i == 0 && len(output.Answers) != 1) || (i > 0 && len(output.Answers) != 2) {
					t.Fatalf("model answers were lost: %s", raw)
				}
			}
			if !result.Success || result.Data.Cue.Uuid != cue.Uuid || result.Data.Cue.Comments != cue.Comments || !bytes.Equal(result.Data.Cue.Transition, cue.Transition) {
				t.Fatalf("cue fields were not preserved: %#v", result)
			}
			config, _ := decodeCueObject(result.Data.Cue.CueConfig)
			if config["mode"] != "normal" || !reflect.DeepEqual(config["enabledGroups"], []any{"a", "b"}) || config["extension"].(map[string]any)["keep"] != true {
				t.Fatalf("incorrect cue config: %s", result.Data.Cue.CueConfig)
			}
			assignments, _ := decodeCueObject(result.Data.Cue.Assignments)
			a := assignments["a"].(map[string]any)["assignment"].(map[string]any)
			b := assignments["b"].(map[string]any)["assignment"].(map[string]any)
			colour := a["colour-a"].(map[string]any)
			if colour["name"] != "Colour" || colour["type"] != "presetColour" || !reflect.DeepEqual(colour["value"], map[string]any{"presetColour": map[string]any{"hex": amber.Hex, "name": amber.Name}}) {
				t.Fatalf("incorrect frontend colour shape: %#v", colour)
			}
			if a["intensity-a"].(map[string]any)["value"].(map[string]any)["presetIntensity"] != json.Number("50") || b["intensity-b"].(map[string]any)["value"].(map[string]any)["presetIntensity"] != json.Number("75") {
				t.Fatal("nonzero intensity choices were not mapped correctly")
			}
			before, _ := decodeCueObject(cue.Assignments)
			if !reflect.DeepEqual(a["position-a"], before["a"].(map[string]any)["assignment"].(map[string]any)["position-a"]) || !reflect.DeepEqual(assignments["disabled"], before["disabled"]) || assignments["extension"] != json.Number("9007199254740993") {
				t.Fatal("unrelated opaque assignment data changed")
			}
		})
	}
}

func TestAssignmentCriteriaRejectsEmptyAndExcessiveOptions(t *testing.T) {
	if _, _, err := assignmentCriteria([]assignmentTarget{{}}); err == nil {
		t.Fatal("expected missing preset options to fail")
	}
	options := make([]any, 65)
	if _, _, err := assignmentCriteria([]assignmentTarget{{options: options}, {options: options}}); err == nil {
		t.Fatal("expected excessive combinations to fail before generation")
	}
}

func TestCompactAssignmentCriteria(t *testing.T) {
	targets := []assignmentTarget{
		{options: make([]any, 2)}, {options: make([]any, 9)},
		{options: make([]any, 9)}, {options: make([]any, 9)},
	}
	criteria, tuples, err := assignmentCriteria(targets)
	if err != nil {
		t.Fatal(err)
	}
	encoded, err := json.Marshal(criteria)
	if err != nil {
		t.Fatal(err)
	}
	if len(criteria) != 1458 || len(encoded) > 30000 {
		t.Fatalf("expected 1458 compact choices under 30000 bytes; got %d choices, %d bytes", len(criteria), len(encoded))
	}
	if !reflect.DeepEqual(tuples["c0"], []int{0, 0, 0, 0}) || !reflect.DeepEqual(tuples["c1457"], []int{1, 8, 8, 8}) {
		t.Fatal("tuple mappings were not copied independently")
	}
	t.Logf("Four-group colour criteria: %d bytes", len(encoded))
}
