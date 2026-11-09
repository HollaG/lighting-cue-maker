package events

import (
	"encoding/json"
	"strings"

	"lighting-cue-maker/server/internal/api/v2/eventscope"
	modelsv2 "lighting-cue-maker/server/internal/models/v2"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
)

func createEvent(c *gin.Context) {
	var req modelsv2.CreateEventReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	name := strings.TrimSpace(req.Event.Name)
	if name == "" {
		response.BadRequest(c, "Event name is required", nil)
		return
	}
	if len(req.Event.Metadata) > 0 && !isJSONObject(req.Event.Metadata) {
		response.BadRequest(c, "Metadata must be a JSON object", nil)
		return
	}

	// copy the template from the global library into the event
	templateIds, invalidIds := normalizeIds(req.FixtureTemplateIds)
	if len(invalidIds) > 0 {
		response.BadRequest(c, "Invalid fixture template IDs", map[string]any{"invalidIds": invalidIds})
		return
	}

	templates := []modelsv2.FixtureTemplate{}
	if len(templateIds) > 0 {
		if err := database.DB().Where("id IN ?", templateIds).Find(&templates).Error; err != nil {
			response.InternalError(c, "Failed to get fixture templates")
			return
		}
	}
	if missing := missingIds(templateIds, templates); len(missing) > 0 {
		response.BadRequest(c, "Unknown fixture templates", map[string]any{"missingIds": missing})
		return
	}

	copies, err := mergeTemplateCopies(nil, templates)
	if err != nil {
		response.InternalError(c, "Failed to copy fixture templates")
		return
	}

	event := modelsv2.Event{
		Name:             name,
		Description:      derefOr(req.Event.Description, ""),
		ExternalLink:     derefOr(req.Event.ExternalLink, ""),
		Metadata:         req.Event.Metadata,
		Status:           modelsv2.EventStatusConfiguring, // req.Event.Status is ignored on create
		FixtureTemplates: copies,
	}
	if len(event.Metadata) == 0 {
		event.Metadata = datatypes.JSON(`{}`)
	}

	if err := database.DB().Create(&event).Error; err != nil {
		response.InternalError(c, "Failed to create event")
		return
	}

	response.Created(c, map[string]any{
		"event": event,
	})
}

func getEvent(c *gin.Context) {
	eventId := eventscope.EventId(c)

	var event modelsv2.Event
	if err := database.DB().First(&event, "id = ?", eventId).Error; err != nil {
		response.InternalError(c, "Failed to get event")
		return
	}

	// TODO: preload

	response.OK(c, map[string]any{
		"event": event,
	})
}

func updateEvent(c *gin.Context) {
	eventId := eventscope.EventId(c)

	var req modelsv2.UpdateEventReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	var event modelsv2.Event
	if err := database.DB().First(&event, "id = ?", eventId).Error; err != nil {
		response.InternalError(c, "Failed to get event")
		return
	}

	// No "event" in the body = leave the event's own fields alone.
	if req.Event != nil {
		name := strings.TrimSpace(req.Event.Name)
		if name == "" {
			response.BadRequest(c, "Event name cannot be empty", nil)
			return
		}
		event.Name = name

		if req.Event.Description != nil {
			event.Description = *req.Event.Description
		}

		if req.Event.ExternalLink != nil {
			event.ExternalLink = *req.Event.ExternalLink
		}

		if req.Event.Metadata != nil {
			if !isJSONObject(req.Event.Metadata) {
				response.BadRequest(c, "Metadata must be a JSON object", nil)
				return
			}
			event.Metadata = req.Event.Metadata
		}
	}

	// if FE sends fixture template IDs, then we append the NEW template ids
	// that are in the request but not in the event
	// do not remove
	if req.FixtureTemplateIds != nil {
		templateIds, invalidIds := normalizeIds(req.FixtureTemplateIds)
		if len(invalidIds) > 0 {
			response.BadRequest(c, "Invalid fixture template IDs", map[string]any{"invalidIds": invalidIds})
			return
		}

		// check what IDs already exist
		existingTemplates := []modelsv2.FixtureTemplate{}
		if len(event.FixtureTemplates) > 0 {
			if err := json.Unmarshal(event.FixtureTemplates, &existingTemplates); err != nil {
				response.InternalError(c, "Failed to parse existing fixture templates")
				return
			}
		}
		existingIds := map[string]bool{}
		for _, t := range existingTemplates {
			existingIds[t.Id] = true
		}

		var newTemplateIds []string
		for _, id := range templateIds {
			if !existingIds[id] {
				newTemplateIds = append(newTemplateIds, id)
			}
		}

		templateIds = newTemplateIds

		// check the existing template list
		templates := []modelsv2.FixtureTemplate{}
		if len(templateIds) > 0 {
			if err := database.DB().Where("id IN ?", templateIds).Find(&templates).Error; err != nil {
				response.InternalError(c, "Failed to get fixture templates")
				return
			}
		}
		if missing := missingIds(templateIds, templates); len(missing) > 0 {
			response.BadRequest(c, "Unknown fixture templates", map[string]any{"missingIds": missing})
			return
		}

		copies, err := mergeTemplateCopies(event.FixtureTemplates, templates)
		if err != nil {
			response.InternalError(c, "Failed to copy fixture templates")
			return
		}
		event.FixtureTemplates = copies
	}

	// FE never update status
	// if req.Event.Status != nil {
	// 	event.Status = *req.Event.Status
	// }

	if err := database.DB().Save(&event).Error; err != nil {
		response.InternalError(c, "Failed to update event")
		return
	}

	response.OK(c, map[string]any{
		"event": event,
	})
}

// mergeTemplateCopies appends copies of the given library templates to an
// event's fixture_templates JSON, skipping templates the event already has.
// A copy keeps the library template's ID (one copy per template per event),
// so patched fixtures can use it as fixtureTemplateId.
func mergeTemplateCopies(existing datatypes.JSON, templates []modelsv2.FixtureTemplate) (datatypes.JSON, error) {
	copies := []json.RawMessage{}
	have := map[string]bool{}
	if len(existing) > 0 {
		if err := json.Unmarshal(existing, &copies); err != nil {
			return nil, err
		}
		for _, raw := range copies {
			var ref struct {
				Id string `json:"id"`
			}
			if err := json.Unmarshal(raw, &ref); err != nil {
				return nil, err
			}
			have[ref.Id] = true
		}
	}

	for _, t := range templates {
		if have[t.Id] {
			continue
		}
		raw, err := json.Marshal(t)
		if err != nil {
			return nil, err
		}
		copies = append(copies, raw)
		have[t.Id] = true
	}

	merged, err := json.Marshal(copies)
	if err != nil {
		return nil, err
	}
	return datatypes.JSON(merged), nil
}

// normalizeIds drops duplicates and returns the IDs that are not valid UUIDs separately.
func normalizeIds(ids []string) (valid []string, invalid []string) {
	seen := map[string]bool{}
	for _, id := range ids {
		if seen[id] {
			continue
		}
		seen[id] = true
		if _, err := uuid.Parse(id); err != nil {
			invalid = append(invalid, id)
			continue
		}
		valid = append(valid, id)
	}
	return valid, invalid
}

func missingIds(ids []string, templates []modelsv2.FixtureTemplate) []string {
	found := map[string]bool{}
	for _, t := range templates {
		found[t.Id] = true
	}
	var missing []string
	for _, id := range ids {
		if !found[id] {
			missing = append(missing, id)
		}
	}
	return missing
}

func isJSONObject(value datatypes.JSON) bool {
	var object map[string]json.RawMessage
	return json.Unmarshal(value, &object) == nil && object != nil
}

func derefOr(value *string, fallback string) string {
	if value == nil {
		return fallback
	}
	return *value
}
