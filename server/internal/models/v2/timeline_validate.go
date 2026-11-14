package v2

import (
	"fmt"
	"math"
	"sort"
)

// SectionLengthMs is how long a section lasts, in whole ms. Beat sections: one
// beat is 60000/bpm ms and a bar has TimeSigNum beats; the total is rounded to
// the nearest ms (the frontend must round the same way, Math.round). Returns
// false if the section's type-specific fields are missing.
func SectionLengthMs(s TimelineSection) (int, bool) {
	switch s.Type {
	case TimelineSectionTypeBeat:
		if s.TimeSigNum == nil || s.Bpm == nil || s.Bars == nil || *s.Bpm <= 0 {
			return 0, false
		}
		return int(math.Round(float64(*s.Bars**s.TimeSigNum) * 60000 / *s.Bpm)), true
	case TimelineSectionTypeTime:
		if s.TotalTimeMs == nil {
			return 0, false
		}
		return *s.TotalTimeMs, true
	}
	return 0, false
}

// ValidateTimeline checks the rules inside a timeline's JSON that the database
// can't, for a Timeline or an AlternateTimeline. Not checked here (needs the
// DB): cueIds are main cues of the item, alternateCueIds are alternates of
// their marker's cueId, and each audio file exists, is READY, belongs to the
// item, and offset + duration ≤ its durationMs.
//
//   - Ids are set and unique (sections, markers and audios each).
//   - Sections have the fields for their type, and don't overlap (touching is fine).
//   - Markers are inside their section (0 ≤ time ≤ length) and cue markers have a cue id.
//   - Audio clips have an audio file, offset ≥ 0, a positive duration, and don't overlap.
//
// All times are whole ms.
func ValidateTimeline(sections []TimelineSection, audios []TimelineAudio) error {
	sectionIds := map[string]bool{}
	markerIds := map[string]bool{}
	sectionSpans := make([]span, 0, len(sections))

	for _, s := range sections {
		if s.Id == "" {
			return fmt.Errorf("section has no id")
		}
		if sectionIds[s.Id] {
			return fmt.Errorf("duplicate section id %q", s.Id)
		}
		sectionIds[s.Id] = true

		if err := validateSectionFields(s); err != nil {
			return fmt.Errorf("section %q: %w", s.Id, err)
		}
		length, _ := SectionLengthMs(s)
		sectionSpans = append(sectionSpans, span{s.Id, s.SectionStartTime, s.SectionStartTime + length})

		for _, m := range s.Markers {
			if m.Id == "" {
				return fmt.Errorf("section %q: marker has no id", s.Id)
			}
			if markerIds[m.Id] {
				return fmt.Errorf("duplicate marker id %q", m.Id)
			}
			markerIds[m.Id] = true

			if m.Time < 0 || m.Time > length {
				return fmt.Errorf("marker %q at %d ms is outside section %q (0–%d ms)", m.Id, m.Time, s.Id, length)
			}
			switch m.Type {
			case TimelineMarkerTypeCue:
				if m.CueId == nil || *m.CueId == "" {
					return fmt.Errorf("cue marker %q has no cueId", m.Id)
				}
				if m.AlternateCueId != nil && *m.AlternateCueId == "" {
					return fmt.Errorf("cue marker %q has an empty alternateCueId (omit it instead)", m.Id)
				}
			default:
				return fmt.Errorf("marker %q: unknown type %q", m.Id, m.Type)
			}
		}
	}
	if a, b, ok := firstOverlap(sectionSpans); ok {
		return fmt.Errorf("sections %q and %q overlap", a, b)
	}

	audioIds := map[string]bool{}
	audioSpans := make([]span, 0, len(audios))
	for _, a := range audios {
		if a.Id == "" {
			return fmt.Errorf("audio has no id")
		}
		if audioIds[a.Id] {
			return fmt.Errorf("duplicate audio id %q", a.Id)
		}
		audioIds[a.Id] = true
		if a.AudioFileId == "" {
			return fmt.Errorf("audio %q has no audioFileId", a.Id)
		}
		if a.StartTime < 0 {
			return fmt.Errorf("audio %q starts before 0", a.Id)
		}
		if a.Offset < 0 {
			return fmt.Errorf("audio %q has a negative offset", a.Id)
		}
		if a.Duration <= 0 {
			return fmt.Errorf("audio %q has no duration", a.Id)
		}
		audioSpans = append(audioSpans, span{a.Id, a.StartTime, a.StartTime + a.Duration})
	}
	if a, b, ok := firstOverlap(audioSpans); ok {
		return fmt.Errorf("audio clips %q and %q overlap", a, b)
	}
	return nil
}

func validateSectionFields(s TimelineSection) error {
	if s.SectionStartTime < 0 {
		return fmt.Errorf("starts before 0")
	}
	switch s.Type {
	case TimelineSectionTypeBeat:
		if s.TimeSigNum == nil || *s.TimeSigNum < 1 {
			return fmt.Errorf("beat section needs timeSigNum ≥ 1")
		}
		if s.TimeSigDenom == nil || !isPowerOfTwo(*s.TimeSigDenom) {
			return fmt.Errorf("beat section needs timeSigDenom of 1, 2, 4, 8, …")
		}
		if s.Bpm == nil || *s.Bpm <= 0 {
			return fmt.Errorf("beat section needs bpm > 0")
		}
		if s.Bars == nil || *s.Bars < 1 {
			return fmt.Errorf("beat section needs bars ≥ 1")
		}
	case TimelineSectionTypeTime:
		if s.TotalTimeMs == nil || *s.TotalTimeMs <= 0 {
			return fmt.Errorf("time section needs totalTimeMs > 0")
		}
	default:
		return fmt.Errorf("unknown type %q", s.Type)
	}
	return nil
}

func isPowerOfTwo(n int) bool { return n >= 1 && n&(n-1) == 0 }

// span is a [start, end) range in ms.
type span struct {
	id         string
	start, end int
}

// firstOverlap sorts by start and returns the first two spans that overlap.
// Touching (a.end == b.start) is not an overlap.
func firstOverlap(spans []span) (string, string, bool) {
	sorted := append([]span(nil), spans...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].start < sorted[j].start })
	for i := 1; i < len(sorted); i++ {
		if sorted[i].start < sorted[i-1].end {
			return sorted[i-1].id, sorted[i].id, true
		}
	}
	return "", "", false
}
