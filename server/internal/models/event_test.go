package models

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestPresetPositionOptionJSONRoundTrip(t *testing.T) {
	want := AttributeTypeOptions{
		PresetPosition: []PresetPositionOption{
			{
				ID:   "position-id",
				Name: "Centre",
			},
		},
	}

	encoded, err := json.Marshal(want)
	if err != nil {
		t.Fatalf("marshal attribute options: %v", err)
	}
	const wantJSON = `{"presetPosition":[{"id":"position-id","name":"Centre"}]}`
	if string(encoded) != wantJSON {
		t.Fatalf("unexpected JSON: got %s, want %s", encoded, wantJSON)
	}

	var got AttributeTypeOptions
	if err := json.Unmarshal(encoded, &got); err != nil {
		t.Fatalf("unmarshal attribute options: %v", err)
	}

	if !reflect.DeepEqual(got, want) {
		t.Fatalf("round trip mismatch: got %#v, want %#v", got, want)
	}
}
