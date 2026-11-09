package events

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	modelsv2 "lighting-cue-maker/server/internal/models/v2"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

const (
	idA = "11111111-1111-1111-1111-111111111111"
	idB = "22222222-2222-2222-2222-222222222222"
)

func copiedIds(t *testing.T, copies datatypes.JSON) []string {
	t.Helper()
	var items []struct {
		Id string `json:"id"`
	}
	if err := json.Unmarshal(copies, &items); err != nil {
		t.Fatalf("unmarshal copies: %v", err)
	}
	ids := []string{}
	for _, item := range items {
		ids = append(ids, item.Id)
	}
	return ids
}

func TestMergeTemplateCopiesKeepsLibraryIds(t *testing.T) {
	a := modelsv2.FixtureTemplate{Name: "A", Type: modelsv2.FixtureTypePar}
	a.Id = idA

	merged, err := mergeTemplateCopies(nil, []modelsv2.FixtureTemplate{a})
	if err != nil {
		t.Fatalf("merge: %v", err)
	}
	if got := copiedIds(t, merged); !reflect.DeepEqual(got, []string{idA}) {
		t.Fatalf("ids = %v, want [%s]", got, idA)
	}
}

func TestMergeTemplateCopiesSkipsTemplatesTheEventAlreadyHas(t *testing.T) {
	a := modelsv2.FixtureTemplate{Name: "A (edited copy)"}
	a.Id = idA
	b := modelsv2.FixtureTemplate{Name: "B"}
	b.Id = idB

	existing := datatypes.JSON(`[{"id":"` + idA + `","name":"A (event copy)"}]`)
	merged, err := mergeTemplateCopies(existing, []modelsv2.FixtureTemplate{a, b})
	if err != nil {
		t.Fatalf("merge: %v", err)
	}
	if got := copiedIds(t, merged); !reflect.DeepEqual(got, []string{idA, idB}) {
		t.Fatalf("ids = %v, want [%s %s]", got, idA, idB)
	}
	// The event's own copy must not be overwritten by the library version.
	if !strings.Contains(string(merged), "A (event copy)") {
		t.Fatalf("existing copy was replaced: %s", merged)
	}
}

func TestNormalizeIds(t *testing.T) {
	valid, invalid := normalizeIds([]string{idA, "nope", idA, idB})
	if !reflect.DeepEqual(valid, []string{idA, idB}) {
		t.Fatalf("valid = %v", valid)
	}
	if !reflect.DeepEqual(invalid, []string{"nope"}) {
		t.Fatalf("invalid = %v", invalid)
	}
}

func TestCreateEventRejectsBadInputBeforeTouchingTheDatabase(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{"not json", `{`},
		{"missing name", `{"event":{"name":"  "},"fixtureTemplateIds":[]}`},
		{"metadata not an object", `{"event":{"name":"Show","metadata":[1]},"fixtureTemplateIds":[]}`},
		{"invalid template id", `{"event":{"name":"Show"},"fixtureTemplateIds":["nope"]}`},
	}

	gin.SetMode(gin.TestMode)
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(recorder)
			ctx.Request = httptest.NewRequest(http.MethodPost, "/api/v2/events", strings.NewReader(test.body))
			ctx.Request.Header.Set("Content-Type", "application/json")

			createEvent(ctx)

			if recorder.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d (%s)", recorder.Code, http.StatusBadRequest, recorder.Body)
			}
		})
	}
}
