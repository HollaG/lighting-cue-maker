package models

import (
	"encoding/json"
	"reflect"
	"sync"
	"testing"

	"gorm.io/gorm/schema"
)

func TestCueConfigDatabaseDefault(t *testing.T) {
	parsed, err := schema.Parse(&Cue{}, &sync.Map{}, schema.NamingStrategy{})
	if err != nil {
		t.Fatalf("parse cue schema: %v", err)
	}

	field := parsed.LookUpField("CueConfig")
	if field == nil {
		t.Fatal("CueConfig field was not found")
	}

	const want = `'{"mode":"unknown"}'`
	if field.DefaultValue != want {
		t.Fatalf("unexpected CueConfig default: got %q, want %q", field.DefaultValue, want)
	}
}

func TestCueConfigPreservesOpaqueJSON(t *testing.T) {
	const payload = `{"cueConfig":{"mode":"normal","enabledGroups":["front"],"future":{"value":1}}}`

	tests := []struct {
		name   string
		target any
	}{
		{name: "create request", target: &CreateCueReq{}},
		{name: "update request", target: &UpdateCueReq{}},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if err := json.Unmarshal([]byte(payload), test.target); err != nil {
				t.Fatalf("unmarshal cue config: %v", err)
			}

			encoded, err := json.Marshal(test.target)
			if err != nil {
				t.Fatalf("marshal cue config: %v", err)
			}

			var got, want map[string]any
			if err := json.Unmarshal(encoded, &got); err != nil {
				t.Fatalf("unmarshal encoded request: %v", err)
			}
			if err := json.Unmarshal([]byte(payload), &want); err != nil {
				t.Fatalf("unmarshal expected request: %v", err)
			}
			if !reflect.DeepEqual(got["cueConfig"], want["cueConfig"]) {
				t.Fatalf("cue config changed: got %#v, want %#v", got["cueConfig"], want["cueConfig"])
			}
		})
	}
}
