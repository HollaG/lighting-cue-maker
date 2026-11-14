package v2

import (
	"strings"
	"testing"
)

func ptr[T any](v T) *T { return &v }

// 4/4 at 120 bpm: a beat is 500 ms, 8 beats (2 bars) 4000 ms.
func beatSection(id string, start int, markers ...TimelineMarker) TimelineSection {
	return TimelineSection{
		Id: id, Name: id, Type: TimelineSectionTypeBeat, SectionStartTime: start, Markers: markers,
		TimeSigNum: ptr(4), TimeSigDenom: ptr(4), Bpm: ptr(120.0), Beats: ptr(8),
	}
}

func timeSection(id string, start, length int, markers ...TimelineMarker) TimelineSection {
	return TimelineSection{
		Id: id, Name: id, Type: TimelineSectionTypeTime, SectionStartTime: start, Markers: markers,
		TotalTimeMs: ptr(length),
	}
}

func cueMarker(id string, time int) TimelineMarker {
	return TimelineMarker{Id: id, Time: time, Type: TimelineMarkerTypeCue, CueId: ptr("cue-" + id)}
}

func withAlternate(m TimelineMarker) TimelineMarker {
	m.AlternateCueId = ptr("alt-" + m.Id)
	return m
}

func TestSectionLengthMs(t *testing.T) {
	if got, ok := SectionLengthMs(beatSection("a", 0)); !ok || got != 4000 {
		t.Errorf("beat section length = %v, %v; want 4000, true", got, ok)
	}
	if got, ok := SectionLengthMs(timeSection("a", 0, 1234)); !ok || got != 1234 {
		t.Errorf("time section length = %v, %v; want 1234, true", got, ok)
	}
	// 4 beats at 90 bpm = 2666.67 ms → 2667.
	odd := beatSection("a", 0)
	odd.Bpm, odd.Beats = ptr(90.0), ptr(4)
	if got, _ := SectionLengthMs(odd); got != 2667 {
		t.Errorf("rounded beat section length = %v; want 2667", got)
	}
	// A section snapped to that rounded end touches it, it doesn't overlap.
	if err := ValidateTimeline([]TimelineSection{odd, timeSection("b", 2667, 100)}, nil); err != nil {
		t.Errorf("section at the rounded end: unexpected error: %v", err)
	}
	// The time signature doesn't change the length: 8 beats in 3/4 are still 4000 ms.
	threeFour := beatSection("a", 0)
	threeFour.TimeSigNum = ptr(3)
	if got, _ := SectionLengthMs(threeFour); got != 4000 {
		t.Errorf("8 beats in 3/4 = %v ms; want 4000", got)
	}
	if _, ok := SectionLengthMs(TimelineSection{Type: TimelineSectionTypeBeat}); ok {
		t.Error("beat section without fields should not have a length")
	}
}

func TestValidateTimelineValid(t *testing.T) {
	sections := []TimelineSection{
		// Out of array order on purpose, touching edges, with a gap after.
		timeSection("b", 4000, 1000, withAlternate(cueMarker("m2", 1000))),
		beatSection("a", 0, cueMarker("m1", 0), cueMarker("m3", 4000)),
		timeSection("c", 9000, 500),
	}
	audios := []TimelineAudio{
		{Id: "x", StartTime: 0, Duration: 3000, AudioFileId: "f1"},
		{Id: "y", StartTime: 3000, Offset: 500, Duration: 1000, AudioFileId: "f1"},
	}
	if err := ValidateTimeline(sections, audios); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if err := ValidateTimeline(nil, nil); err != nil {
		t.Fatalf("empty timeline: unexpected error: %v", err)
	}
}

func TestValidateTimelineErrors(t *testing.T) {
	noCue := cueMarker("m", 0)
	noCue.CueId = nil
	emptyAlt := cueMarker("m", 0)
	emptyAlt.AlternateCueId = ptr("")
	noBpm := beatSection("a", 0)
	noBpm.Bpm = nil
	badDenom := beatSection("a", 0)
	badDenom.TimeSigDenom = ptr(3)

	tests := []struct {
		name     string
		sections []TimelineSection
		audios   []TimelineAudio
		want     string
	}{
		{"section without id", []TimelineSection{timeSection("", 0, 100)}, nil, "no id"},
		{"duplicate section id", []TimelineSection{timeSection("a", 0, 100), timeSection("a", 100, 100)}, nil, "duplicate section"},
		{"unknown section type", []TimelineSection{{Id: "a", Type: "bars"}}, nil, "unknown type"},
		{"beat section without bpm", []TimelineSection{noBpm}, nil, "bpm"},
		{"beat section with bad denominator", []TimelineSection{badDenom}, nil, "timeSigDenom"},
		{"time section without length", []TimelineSection{{Id: "a", Type: TimelineSectionTypeTime}}, nil, "totalTimeMs"},
		{"negative start", []TimelineSection{timeSection("a", -1, 100)}, nil, "before 0"},
		{"sections overlap", []TimelineSection{beatSection("a", 0), timeSection("b", 3999, 100)}, nil, "overlap"},
		{"marker past the end", []TimelineSection{beatSection("a", 0, cueMarker("m", 4001))}, nil, "outside section"},
		{"marker before the start", []TimelineSection{beatSection("a", 0, cueMarker("m", -1))}, nil, "outside section"},
		{"duplicate marker id across sections", []TimelineSection{
			timeSection("a", 0, 100, cueMarker("m", 0)), timeSection("b", 100, 100, cueMarker("m", 0)),
		}, nil, "duplicate marker"},
		{"cue marker without cue", []TimelineSection{timeSection("a", 0, 100, noCue)}, nil, "no cueId"},
		{"cue marker with empty alternate", []TimelineSection{timeSection("a", 0, 100, emptyAlt)}, nil, "empty alternateCueId"},
		{"unknown marker type", []TimelineSection{timeSection("a", 0, 100, TimelineMarker{Id: "m", Type: "lyric"})}, nil, "unknown type"},
		{"audio without file", nil, []TimelineAudio{{Id: "x", Duration: 1}}, "no audioFileId"},
		{"audio without duration", nil, []TimelineAudio{{Id: "x", AudioFileId: "f"}}, "no duration"},
		{"audio with negative offset", nil, []TimelineAudio{{Id: "x", AudioFileId: "f", Offset: -1, Duration: 1}}, "negative offset"},
		{"duplicate audio id", nil, []TimelineAudio{
			{Id: "x", AudioFileId: "f", Duration: 1}, {Id: "x", AudioFileId: "f", StartTime: 5, Duration: 1},
		}, "duplicate audio"},
		{"audio clips overlap", nil, []TimelineAudio{
			{Id: "x", AudioFileId: "f", Duration: 1000}, {Id: "y", AudioFileId: "f", StartTime: 500, Duration: 1000},
		}, "overlap"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateTimeline(tt.sections, tt.audios)
			if err == nil {
				t.Fatalf("want error containing %q, got nil", tt.want)
			}
			if !strings.Contains(err.Error(), tt.want) {
				t.Fatalf("want error containing %q, got %q", tt.want, err.Error())
			}
		})
	}
}
