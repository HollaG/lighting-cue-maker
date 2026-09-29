package ai

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"

	"gorm.io/datatypes"
	"lighting-cue-maker/server/internal/models"
)

func TestBuildJevStateStripsMetadata(t *testing.T) {
	groups := []models.FixtureGroupConfiguration{
		{Uuid: "DROP_GROUP_UUID", Name: "Spots", Description: "Highlight performers", Attributes: []models.AttributeConfiguration{
			{Uuid: "colour", Name: "Colour", Type: models.AttributeTypePresetColour, Metadata: map[string]any{"DROP_METADATA": true}},
			{Uuid: "intensity", Name: "Intensity", Type: models.AttributeTypePresetIntensity},
			{Uuid: "position", Name: "Position", Type: models.AttributeTypePresetPosition},
		}},
		{Uuid: "DROP_DISABLED_UUID", Name: "Wash"},
	}
	previous := &models.Cue{
		Uuid: "previous", Comments: "Quiet opening",
		CueConfig: datatypes.JSON(`{"mode":"normal","enabledGroups":["DROP_GROUP_UUID"],"extra":"DROP_CONFIG"}`),
		Assignments: datatypes.JSON(`{
"DROP_GROUP_UUID":{"name":"DROP_OLD_NAME","assignment":{
"colour":{"value":{"presetColour":{"hex":"#ffffff","name":"White","extra":"DROP_EXTRA"}}},
"intensity":{"value":{"presetIntensity":0}},
"position":{"value":{"presetPosition":{"id":"DROP_POSITION_UUID","name":"Solo"}}},
"unsupported":{"value":{"text":"DROP_UNSUPPORTED"}}}},
"DROP_DISABLED_UUID":{"name":"DROP_DISABLED","assignment":{}}}`),
	}
	request := GenerateCueRequest{
		Lyrics:        "[Verse]\n{cueId=target=cueId}Lyrics",
		Cue:           &models.Cue{Uuid: "target", Comments: "Build energy", Assignments: datatypes.JSON(`{"DROP_TARGET_ASSIGNMENTS":true}`)},
		PreviousCue:   previous,
		NextCue:       &models.Cue{Uuid: "next", Comments: "Later", CueConfig: datatypes.JSON(`{"mode":"unknown"}`), Assignments: datatypes.JSON(`{"DROP_UNKNOWN_ASSIGNMENTS":true}`)},
		FixtureGroups: groups,
	}
	original, _ := json.Marshal(request)
	state, err := buildJevState(request, fixtureGroupRefs(groups))
	if err != nil {
		t.Fatal(err)
	}
	for _, excluded := range []string{"DROP_", "createdAt", "updatedAt", "deletedAt", "updatedBy", "metadata", "optionPossibleValues", "transition"} {
		if strings.Contains(state, excluded) {
			t.Fatalf("unneeded data remains in Jev state: %s", excluded)
		}
	}
	var decoded struct {
		Lyrics   string            `json:"lyrics"`
		Target   jevCueContext     `json:"targetCue"`
		Previous jevCueContext     `json:"previousCue"`
		Next     jevCueContext     `json:"nextCue"`
		Groups   []jevGroupContext `json:"groups"`
	}
	if err := json.Unmarshal([]byte(state), &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded.Lyrics != request.Lyrics || decoded.Target.ID != "target" || decoded.Target.Comments != "Build energy" || decoded.Groups[0].Description != groups[0].Description {
		t.Fatal("required song or group context was lost")
	}
	if decoded.Previous.ID != "previous" || decoded.Previous.Comments != "Quiet opening" || decoded.Previous.Mode != "normal" || !reflect.DeepEqual(decoded.Previous.EnabledGroups, []string{"g0"}) || len(decoded.Previous.Settings) != 3 {
		t.Fatalf("previous cue context lost: %#v", decoded.Previous)
	}
	if decoded.Previous.Settings[1].Value != float64(0) || decoded.Previous.Settings[2].Value != "Solo" {
		t.Fatal("zero intensity or position name was lost")
	}
	if decoded.Next.Mode != "unknown" || len(decoded.Next.Settings) != 0 {
		t.Fatal("unknown cue should not send settings")
	}
	after, _ := json.Marshal(request)
	if string(original) != string(after) {
		t.Fatal("compaction mutated the original request")
	}
}
