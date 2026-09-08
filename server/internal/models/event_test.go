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

func TestFixtureGroupDescriptionJSONContracts(t *testing.T) {
	const payload = `{"name":"Front wash","description":"Fixtures covering the front of the stage"}`

	var createReq CreateFixtureGroupConfigurationReq
	if err := json.Unmarshal([]byte(payload), &createReq); err != nil {
		t.Fatalf("unmarshal create fixture group request: %v", err)
	}
	if createReq.Description != "Fixtures covering the front of the stage" {
		t.Fatalf("unexpected create description: %q", createReq.Description)
	}

	var upsertReq UpsertFixtureGroupConfigurationReq
	if err := json.Unmarshal([]byte(payload), &upsertReq); err != nil {
		t.Fatalf("unmarshal upsert fixture group request: %v", err)
	}
	if upsertReq.Description != "Fixtures covering the front of the stage" {
		t.Fatalf("unexpected upsert description: %q", upsertReq.Description)
	}

	var updateReq UpdateFixtureGroupConfigurationReq
	if err := json.Unmarshal([]byte(payload), &updateReq); err != nil {
		t.Fatalf("unmarshal update fixture group request: %v", err)
	}
	if updateReq.Description == nil || *updateReq.Description != "Fixtures covering the front of the stage" {
		t.Fatalf("unexpected update description: %#v", updateReq.Description)
	}

	encoded, err := json.Marshal(FixtureGroupConfiguration{
		Name:        "Front wash",
		Description: "Fixtures covering the front of the stage",
	})
	if err != nil {
		t.Fatalf("marshal fixture group: %v", err)
	}

	var got map[string]any
	if err := json.Unmarshal(encoded, &got); err != nil {
		t.Fatalf("unmarshal fixture group JSON: %v", err)
	}
	if got["description"] != "Fixtures covering the front of the stage" {
		t.Fatalf("unexpected response description: %#v", got["description"])
	}
}
