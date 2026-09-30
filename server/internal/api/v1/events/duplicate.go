// Disclaimer: this file was written by AI. I ran out of time...
// the prompt:
// if i wanted to create an endpoint that takes in an event ID and duplicates the whole event (including attribute_configs, fixture_group_configs, fixtures, visualisers, what would I need to do
// I only want to copy the event structure, not the UGC within an event
// okay, help me implement POST /api/v1/events/duplicate and the body is { eventId: xxx }. return the { newEventId: yyy }

package events

import (
	"encoding/json"
	"errors"
	"time"

	"lighting-cue-maker/server/internal/models"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// duplicateEventStructure runs inside the caller's transaction. Only event
// configuration is copied; items, cues, alternates and bumps remain in the source.
func duplicateEventStructure(tx *gorm.DB, eventID string) (string, error) {
	var source models.LightEvent
	err := tx.Preload("FixtureGroups.Attributes").Preload("BumpConfigurations").
		Where("uuid = ?", eventID).First(&source).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", errEventNotFound
	}
	if err != nil {
		return "", err
	}

	// Fresh records avoid saving preloaded source associations or old timestamps.
	event := models.LightEvent{
		Name:              source.Name + " (copy)",
		Description:       source.Description,
		ExternalLink:      source.ExternalLink,
		CuesPerBand:       source.CuesPerBand,
		UniqueCuesPerBand: source.UniqueCuesPerBand,
	}
	if err := tx.Create(&event).Error; err != nil {
		return "", err
	}

	groupIDs := make(map[string]string, len(source.FixtureGroups))
	fixtureIDs := make(map[string]string)
	for _, sourceGroup := range source.FixtureGroups {
		group := models.FixtureGroupConfiguration{
			LightEventUuid: event.Uuid,
			Name:           sourceGroup.Name,
			Description:    sourceGroup.Description,
			Order:          sourceGroup.Order,
		}
		if err := tx.Create(&group).Error; err != nil {
			return "", err
		}
		groupIDs[sourceGroup.Uuid] = group.Uuid

		for _, sourceAttribute := range sourceGroup.Attributes {
			attribute := models.AttributeConfiguration{
				FixtureGroupConfigurationUuid: group.Uuid,
				Name:                          sourceAttribute.Name,
				Type:                          sourceAttribute.Type,
				Metadata:                      sourceAttribute.Metadata,
				Options:                       sourceAttribute.Options,
				Order:                         sourceAttribute.Order,
			}
			if err := tx.Create(&attribute).Error; err != nil {
				return "", err
			}
		}

		var fixtures []models.Fixture
		if err := tx.Where("fixture_group_configuration_uuid = ?", sourceGroup.Uuid).
			Find(&fixtures).Error; err != nil {
			return "", err
		}
		for _, sourceFixture := range fixtures {
			fixture := sourceFixture
			fixture.Uuid = ""
			fixture.FixtureGroupConfigurationUuid = group.Uuid
			fixture.CreatedAt = time.Time{}
			fixture.UpdatedAt = time.Time{}
			fixture.DeletedAt = gorm.DeletedAt{}
			if err := tx.Create(&fixture).Error; err != nil {
				return "", err
			}
			// GORM substitutes the default 100 on create when brightness is zero.
			// Restore an explicitly saved zero before committing the copy.
			if sourceFixture.MaxBrightness == 0 {
				if err := tx.Model(&fixture).UpdateColumn("max_brightness", 0).Error; err != nil {
					return "", err
				}
			}
			fixtureIDs[sourceFixture.Uuid] = fixture.Uuid
		}
	}

	for _, sourceBump := range source.BumpConfigurations {
		bump := models.BumpConfiguration{
			LightEventUuid: event.Uuid,
			Name:           sourceBump.Name,
			Description:    sourceBump.Description,
		}
		if err := tx.Create(&bump).Error; err != nil {
			return "", err
		}
	}

	var visualiser models.Visualiser
	err = tx.Where("light_event_uuid = ?", source.Uuid).First(&visualiser).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return event.Uuid, nil // Events may not have opened the visualiser yet.
	}
	if err != nil {
		return "", err
	}
	visualiser.Uuid = ""
	visualiser.LightEventUuid = event.Uuid
	visualiser.FixtureAttributeMapping, err = remapFixtureAttributeMapping(
		visualiser.FixtureAttributeMapping, groupIDs, fixtureIDs,
	)
	if err != nil {
		return "", err
	}
	if err := tx.Create(&visualiser).Error; err != nil {
		return "", err
	}
	return event.Uuid, nil
}

// Remap only database references. Position-option IDs are local to the copied
// configuration and stay unchanged. Stale mappings for deleted records are dropped.
// RawMessage preserves attribute extensions and numeric values without rounding.
func remapFixtureAttributeMapping(raw datatypes.JSON, groupIDs, fixtureIDs map[string]string) (datatypes.JSON, error) {
	if len(raw) == 0 {
		return raw, nil
	}
	var groups map[string]json.RawMessage
	if err := json.Unmarshal(raw, &groups); err != nil {
		return nil, err
	}
	if groups == nil {
		return raw, nil
	}

	result := make(map[string]json.RawMessage, len(groups))
	for oldGroupID, rawAttributes := range groups {
		newGroupID, ok := groupIDs[oldGroupID]
		if !ok {
			continue
		}
		var attributes map[string]json.RawMessage
		if err := json.Unmarshal(rawAttributes, &attributes); err != nil {
			return nil, err
		}
		if rawPositions, ok := attributes[string(models.AttributeTypePresetPosition)]; ok {
			var positions map[string]map[string]json.RawMessage
			if err := json.Unmarshal(rawPositions, &positions); err != nil {
				return nil, err
			}
			for positionID, fixtures := range positions {
				remapped := make(map[string]json.RawMessage, len(fixtures))
				for oldFixtureID, value := range fixtures {
					if newFixtureID, ok := fixtureIDs[oldFixtureID]; ok {
						remapped[newFixtureID] = value
					}
				}
				positions[positionID] = remapped
			}
			encoded, err := json.Marshal(positions)
			if err != nil {
				return nil, err
			}
			attributes[string(models.AttributeTypePresetPosition)] = encoded
		}
		encoded, err := json.Marshal(attributes)
		if err != nil {
			return nil, err
		}
		result[newGroupID] = encoded
	}
	return json.Marshal(result)
}
