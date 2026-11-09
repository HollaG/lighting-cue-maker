package fixturegroups

import (
	"encoding/json"
	"testing"

	modelsv2 "lighting-cue-maker/server/internal/models/v2"

	"gorm.io/datatypes"
)

const (
	eventId  = "00000000-0000-0000-0000-000000000000"
	groupId  = "11111111-1111-1111-1111-111111111111"
	fixtureA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
	fixtureB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
)

func ptr[T any](v T) *T { return &v }

func decodeReq(t *testing.T, body string) modelsv2.UpsertFixtureGroupsReq {
	t.Helper()
	var req modelsv2.UpsertFixtureGroupsReq
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return req
}

func TestGridLeftOutVsNull(t *testing.T) {
	req := decodeReq(t, `{"fixtureGroups":[{"name":"a"},{"name":"b","grid":null}]}`)
	if req.FixtureGroups[0].Grid != nil {
		t.Fatalf("left out grid = %q, want nil", req.FixtureGroups[0].Grid)
	}
	if string(req.FixtureGroups[1].Grid) != "null" {
		t.Fatalf("null grid = %q, want \"null\"", req.FixtureGroups[1].Grid)
	}
}

func TestBuildGroupsCreatesWithDefaults(t *testing.T) {
	rows, errs := buildGroups(
		[]modelsv2.UpsertFixtureGroupReq{{Name: ptr("  Front wash ")}},
		eventId, nil, nil,
	)
	if len(errs) > 0 {
		t.Fatalf("unexpected errors: %+v", errs)
	}
	row := rows[0]
	if row.Name != "Front wash" || row.EventId != eventId || row.FixtureIds == nil || row.Grid != nil {
		t.Fatalf("unexpected row: %+v", row)
	}
}

func TestBuildGroupsUpdateKeepsFieldsLeftOut(t *testing.T) {
	existing := map[string]modelsv2.FixtureGroup{groupId: {
		Base:        modelsv2.Base{Id: groupId},
		EventId:     eventId,
		Name:        "Old",
		Description: "keep me",
		FixtureIds:  datatypes.JSONSlice[string]{fixtureA},
		Grid:        datatypes.JSON(`{"cols":1,"rows":1,"cells":[{"fixtureId":"` + fixtureA + `","head":0,"col":0,"row":0}]}`),
		SortOrder:   3,
	}}

	req := decodeReq(t, `{"fixtureGroups":[{"id":"`+groupId+`","name":"New"}]}`)
	rows, errs := buildGroups(req.FixtureGroups, eventId, existing, nil)
	if len(errs) > 0 {
		t.Fatalf("unexpected errors: %+v", errs)
	}
	row := rows[0]
	if row.Name != "New" || row.Description != "keep me" || row.SortOrder != 3 || len(row.FixtureIds) != 1 || row.Grid == nil {
		t.Fatalf("unexpected row: %+v", row)
	}

	// grid: null removes the layout.
	req = decodeReq(t, `{"fixtureGroups":[{"id":"`+groupId+`","grid":null}]}`)
	rows, errs = buildGroups(req.FixtureGroups, eventId, existing, nil)
	if len(errs) > 0 || rows[0].Grid != nil {
		t.Fatalf("grid = %q, errs = %+v; want nil grid", rows[0].Grid, errs)
	}
}

func TestBuildGroupsReportsEachBadRow(t *testing.T) {
	existing := map[string]modelsv2.FixtureGroup{groupId: {
		Base: modelsv2.Base{Id: groupId}, EventId: eventId, Name: "G",
		FixtureIds: datatypes.JSONSlice[string]{fixtureA},
	}}
	eventFixtures := map[string]bool{fixtureA: true, fixtureB: true}

	body := `{"fixtureGroups":[
		{"name":"ok","fixtureIds":["` + fixtureA + `","` + fixtureA + `"]},
		{"name":"   "},
		{"id":"22222222-2222-2222-2222-222222222222","name":"x"},
		{"name":"x","fixtureIds":["cccccccc-cccc-cccc-cccc-cccccccccccc"]},
		{"id":"` + groupId + `","fixtureIds":["` + fixtureB + `"]}
	]}`
	// 0 ok (duplicate member dropped)
	// 1 blank name
	// 2 group not in event
	// 3 fixture not in event
	// 4 ok (update with only fixtureIds keeps the name)

	rows, errs := buildGroups(decodeReq(t, body).FixtureGroups, eventId, existing, eventFixtures)

	got := []int{}
	for _, e := range errs {
		got = append(got, e.Index)
	}
	want := []int{1, 2, 3}
	if fmtInts(got) != fmtInts(want) {
		t.Fatalf("error indexes = %v, want %v (%+v)", got, want, errs)
	}
	if len(rows[0].FixtureIds) != 1 {
		t.Fatalf("duplicate member not dropped: %v", rows[0].FixtureIds)
	}
}

func TestValidateIds(t *testing.T) {
	errs := validateIds([]modelsv2.UpsertFixtureGroupReq{
		{Id: ptr(groupId)},
		{Id: ptr(groupId)},                      // duplicate
		{Id: ptr("nope")},                       // invalid
		{FixtureIds: []string{fixtureA, "bad"}}, // invalid fixture id
	})
	got := []int{}
	for _, e := range errs {
		got = append(got, e.Index)
	}
	if fmtInts(got) != fmtInts([]int{1, 2, 3}) {
		t.Fatalf("error indexes = %v, want [1 2 3] (%+v)", got, errs)
	}
}

func fmtInts(v []int) string {
	b, _ := json.Marshal(v)
	return string(b)
}
