package ai

import (
	"encoding/json"
	"fmt"
	"strconv"

	"lighting-cue-maker/server/internal/models"
)

// These are prompt-only views. The original cue JSON stays intact for the response.
type jevGroupContext struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type jevSettingContext struct {
	Group     string               `json:"group"`
	Attribute string               `json:"attribute"`
	Type      models.AttributeType `json:"type"`
	Value     any                  `json:"value"`
}

type jevCueContext struct {
	ID            string              `json:"id"`
	Comments      string              `json:"comments,omitempty"`
	Mode          string              `json:"mode,omitempty"`
	EnabledGroups []string            `json:"enabledGroups,omitempty"`
	Settings      []jevSettingContext `json:"settings,omitempty"`
}

func fixtureGroupRefs(groups []models.FixtureGroupConfiguration) map[string]string {
	refs := make(map[string]string, len(groups))
	for i, group := range groups {
		refs[group.Uuid] = "g" + strconv.Itoa(i)
	}
	return refs
}

// buildJevState whitelists decision context instead of serializing database models.
// Group UUIDs are replaced consistently with request-local references.
func buildJevState(req GenerateCueRequest, refs map[string]string) (string, error) {
	state := struct {
		Lyrics   string            `json:"lyrics"`
		Target   jevCueContext     `json:"targetCue"`
		Groups   []jevGroupContext `json:"groups"`
		Previous *jevCueContext    `json:"previousCue,omitempty"`
		Next     *jevCueContext    `json:"nextCue,omitempty"`
	}{
		Lyrics: req.Lyrics,
		Target: jevCueContext{ID: req.Cue.Uuid, Comments: req.Cue.Comments},
		Groups: make([]jevGroupContext, 0, len(req.FixtureGroups)),
	}
	for _, group := range req.FixtureGroups {
		state.Groups = append(state.Groups, jevGroupContext{
			ID: refs[group.Uuid], Name: group.Name, Description: group.Description,
		})
	}
	var err error
	state.Previous, err = compactJevCue(req.PreviousCue, req.FixtureGroups, refs)
	if err != nil {
		return "", err
	}
	state.Next, err = compactJevCue(req.NextCue, req.FixtureGroups, refs)
	if err != nil {
		return "", err
	}
	encoded, err := json.Marshal(state)
	return string(encoded), err
}

func compactJevCue(cue *models.Cue, groups []models.FixtureGroupConfiguration, refs map[string]string) (*jevCueContext, error) {
	if cue == nil {
		return nil, nil
	}
	result := &jevCueContext{ID: cue.Uuid, Comments: cue.Comments, Mode: "unknown"}
	config, err := decodeCueObject(cue.CueConfig)
	if err != nil {
		return nil, fmt.Errorf("decode neighbouring cue config: %w", err)
	}
	if mode, ok := config["mode"].(string); ok && (mode == "normal" || mode == "blackout") {
		result.Mode = mode
	}
	if result.Mode != "normal" {
		return result, nil
	}
	enabled := make(map[string]bool)
	if ids, ok := config["enabledGroups"].([]any); ok {
		for _, value := range ids {
			if id, ok := value.(string); ok && refs[id] != "" && !enabled[id] {
				enabled[id] = true
				result.EnabledGroups = append(result.EnabledGroups, refs[id])
			}
		}
	}
	assignments, err := decodeCueObject(cue.Assignments)
	if err != nil {
		return nil, fmt.Errorf("decode neighbouring cue assignments: %w", err)
	}
	for _, group := range groups {
		if !enabled[group.Uuid] {
			continue
		}
		groupData, _ := assignments[group.Uuid].(map[string]any)
		attributes, _ := groupData["assignment"].(map[string]any)
		for _, attribute := range group.Attributes {
			data, _ := attributes[attribute.Uuid].(map[string]any)
			values, _ := data["value"].(map[string]any)
			var value any
			switch attribute.Type {
			case models.AttributeTypePresetColour:
				colour, _ := values[string(attribute.Type)].(map[string]any)
				hex, _ := colour["hex"].(string)
				name, _ := colour["name"].(string)
				if hex != "" || name != "" {
					value = models.ColourOption{Hex: hex, Name: name}
				}
			case models.AttributeTypePresetIntensity:
				if intensity, ok := values[string(attribute.Type)].(json.Number); ok {
					value = intensity
				}
			case models.AttributeTypePresetPosition:
				position, _ := values[string(attribute.Type)].(map[string]any)
				if name, ok := position["name"].(string); ok && name != "" {
					value = name
				}
			}
			if value != nil {
				result.Settings = append(result.Settings, jevSettingContext{
					Group: refs[group.Uuid], Attribute: attribute.Name, Type: attribute.Type, Value: value,
				})
			}
		}
	}
	return result, nil
}
