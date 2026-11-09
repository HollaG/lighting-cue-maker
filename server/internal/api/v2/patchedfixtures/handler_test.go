package patchedfixtures

import (
	"testing"

	modelsv2 "lighting-cue-maker/server/internal/models/v2"

	"gorm.io/datatypes"
)

const (
	tmplId = "11111111-1111-1111-1111-111111111111"
	fixId  = "22222222-2222-2222-2222-222222222222"
)

func ptr(s string) *string { return &s }

func testModes(t *testing.T) map[string]map[string]bool {
	t.Helper()
	modes, err := templateModes(datatypes.JSON(`[{"id":"` + tmplId + `","modes":[{"id":"m1"},{"id":"m2"}]}]`))
	if err != nil {
		t.Fatalf("templateModes: %v", err)
	}
	return modes
}

func TestValidateFixturesAcceptsValidRows(t *testing.T) {
	fixtures := []modelsv2.UpsertPatchedFixtureReq{
		{FixtureTemplateId: tmplId, ModeId: "m1"},
		{Id: ptr(fixId), FixtureTemplateId: tmplId, ModeId: "m2", PosX: 0},
	}
	if errs := validateFixtures(fixtures, testModes(t)); len(errs) != 0 {
		t.Fatalf("unexpected errors: %+v", errs)
	}
}

func TestValidateFixturesReportsEachBadRow(t *testing.T) {
	fixtures := []modelsv2.UpsertPatchedFixtureReq{
		{FixtureTemplateId: tmplId, ModeId: "m1"},                  // 0 ok
		{FixtureTemplateId: "not-in-event", ModeId: "m1"},          // 1 unknown template
		{FixtureTemplateId: tmplId, ModeId: "nope"},                // 2 unknown mode
		{Id: ptr("nope"), FixtureTemplateId: tmplId, ModeId: "m1"}, // 3 invalid id
		{Id: ptr(fixId), FixtureTemplateId: tmplId, ModeId: "m1"},  // 4 ok
		{Id: ptr(fixId), FixtureTemplateId: tmplId, ModeId: "m1"},  // 5 duplicate id
	}

	errs := validateFixtures(fixtures, testModes(t))

	got := []int{}
	for _, e := range errs {
		got = append(got, e.Index)
	}
	want := []int{1, 2, 3, 5}
	if len(got) != len(want) {
		t.Fatalf("error indexes = %v, want %v (%+v)", got, want, errs)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("error indexes = %v, want %v (%+v)", got, want, errs)
		}
	}
}

func TestFixtureFromRequestTakesEventFromPath(t *testing.T) {
	row := fixtureFromRequest(modelsv2.UpsertPatchedFixtureReq{
		Id: ptr(fixId), FixtureTemplateId: tmplId, ModeId: "m1", Name: "  Front left  ", PosX: 1.5, RotZ: 90,
	}, "event-from-path")

	if row.EventId != "event-from-path" || row.Id != fixId || row.Name != "Front left" || row.PosX != 1.5 || row.RotZ != 90 {
		t.Fatalf("unexpected row: %+v", row)
	}
}
