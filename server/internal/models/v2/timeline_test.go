package v2

import (
	"encoding/json"
	"testing"
)

func TestTimelineNormalizeTurnsNullListsIntoEmpty(t *testing.T) {
	f := TimelineFields{Sections: []TimelineSection{{Id: "a"}}}
	f.Normalize()
	if f.Audios == nil || f.Sections[0].Markers == nil {
		t.Fatalf("lists still nil: %+v", f)
	}
	out, _ := json.Marshal(f)
	want := `{"sections":[{"id":"a","name":"","type":"","sectionStartTime":0,"linkToNext":false,"markers":[],"snapEnabled":false}],"audios":[],"snapEnabled":false}`
	if string(out) != want {
		t.Fatalf("json =\n%s\nwant\n%s", out, want)
	}
}

func TestRemoveCueMarkers(t *testing.T) {
	f := TimelineFields{Sections: []TimelineSection{
		timeSection("a", 0, 100, cueMarker("1", 0), cueMarker("2", 10), cueMarker("1b", 20)),
		timeSection("b", 100, 100, cueMarker("3", 0)),
	}}
	// cueMarker gives marker "1" the cue "cue-1"; make "1b" point to the same cue.
	f.Sections[0].Markers[2].CueId = ptr("cue-1")

	if !f.RemoveCueMarkers("cue-1") {
		t.Fatal("want removed = true")
	}
	if got := len(f.Sections[0].Markers); got != 1 || f.Sections[0].Markers[0].Id != "2" {
		t.Fatalf("section a markers = %+v, want only marker 2", f.Sections[0].Markers)
	}
	if len(f.Sections[1].Markers) != 1 {
		t.Fatalf("section b changed: %+v", f.Sections[1].Markers)
	}
	if f.RemoveCueMarkers("cue-1") {
		t.Fatal("second removal: want removed = false")
	}
}

func TestUpsertTimelineReqLeftOutVsEmpty(t *testing.T) {
	var body UpsertTimelineReqBody
	if err := json.Unmarshal([]byte(`{"timeline":{"audios":[]}}`), &body); err != nil {
		t.Fatal(err)
	}
	in := body.Timeline
	if in.Sections != nil || in.SnapEnabled != nil {
		t.Fatalf("left-out fields should be nil: %+v", in)
	}
	if in.Audios == nil || len(*in.Audios) != 0 {
		t.Fatalf("audios: [] should be an empty, non-nil list: %+v", in.Audios)
	}
}

// Times are whole ms: a fractional value is rejected when the body is decoded,
// so the frontend must round.
func TestTimelineTimesMustBeWholeMs(t *testing.T) {
	var body UpsertTimelineReqBody
	err := json.Unmarshal([]byte(`{"timeline":{"sections":[{"id":"a","type":"time","sectionStartTime":3333.33,"totalTimeMs":100}]}}`), &body)
	if err == nil {
		t.Fatal("want a decode error for a fractional ms value")
	}
}
