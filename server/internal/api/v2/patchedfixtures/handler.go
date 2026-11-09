package patchedfixtures

import (
	"encoding/json"
	"fmt"
	"strings"

	"lighting-cue-maker/server/internal/api/v2/eventscope"
	modelsv2 "lighting-cue-maker/server/internal/models/v2"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// rowError points at one entry of the request's fixtures array.
type rowError struct {
	Index int    `json:"index"`
	Error string `json:"error"`
}

// upsertPatchedFixtures creates (no id) or updates (id) several fixtures in
// one transaction. Fixtures not in the request are left alone. The response
// lists the saved fixtures in request order, so new IDs line up by index.
func upsertPatchedFixtures(c *gin.Context) {
	eventId := eventscope.EventId(c)

	var req modelsv2.UpsertPatchedFixturesReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	var event modelsv2.Event
	if err := database.DB().Select("id", "fixture_templates").Where("id = ?", eventId).First(&event).Error; err != nil {
		response.InternalError(c, "Failed to get event")
		return
	}
	modes, err := templateModes(event.FixtureTemplates)
	if err != nil {
		response.InternalError(c, "Failed to read event fixture templates")
		return
	}

	if errs := validateFixtures(req.Fixtures, modes); len(errs) > 0 {
		response.BadRequest(c, "Invalid fixtures", map[string]any{"errors": errs})
		return
	}

	// Existing fixtures must belong to this event (and not be deleted).
	updateIds := []string{}
	for _, f := range req.Fixtures {
		if f.Id != nil {
			updateIds = append(updateIds, *f.Id)
		}
	}
	existing := map[string]bool{}
	if len(updateIds) > 0 {
		var found []string
		if err := database.DB().Model(&modelsv2.PatchedFixture{}).
			Where("event_id = ? AND id IN ?", eventId, updateIds).
			Pluck("id", &found).Error; err != nil {
			response.InternalError(c, "Failed to get fixtures")
			return
		}
		for _, id := range found {
			existing[id] = true
		}
	}
	var notFound []rowError
	for i, f := range req.Fixtures {
		if f.Id != nil && !existing[*f.Id] {
			notFound = append(notFound, rowError{i, "fixture not found in this event"})
		}
	}
	if len(notFound) > 0 {
		response.BadRequest(c, "Invalid fixtures", map[string]any{"errors": notFound})
		return
	}

	saved := make([]modelsv2.PatchedFixture, len(req.Fixtures))
	err = database.DB().Transaction(func(tx *gorm.DB) error {
		for i, f := range req.Fixtures {
			row := fixtureFromRequest(f, eventId)
			if f.Id == nil {
				if err := tx.Create(&row).Error; err != nil {
					return err
				}
			} else {
				// Select lists every editable column so zero values (e.g. posX 0) are written too.
				if err := tx.Model(&row).
					Select("FixtureTemplateId", "ModeId", "Name", "PosX", "PosY", "PosZ", "RotX", "RotY", "RotZ").
					Updates(&row).Error; err != nil {
					return err
				}
				if err := tx.First(&row, "id = ?", row.Id).Error; err != nil {
					return err
				}
			}
			saved[i] = row
		}
		return nil
	})
	if err != nil {
		response.InternalError(c, "Failed to save fixtures")
		return
	}

	response.OK(c, map[string]any{
		"fixtures": saved,
	})
}

// validateFixtures checks each entry without touching the database.
// modes maps template ID -> set of its mode IDs (from the event's own copies).
func validateFixtures(fixtures []modelsv2.UpsertPatchedFixtureReq, modes map[string]map[string]bool) []rowError {
	var errs []rowError
	seen := map[string]bool{}
	for i, f := range fixtures {
		if f.Id != nil {
			if _, err := uuid.Parse(*f.Id); err != nil {
				errs = append(errs, rowError{i, "invalid id"})
				continue
			}
			if seen[*f.Id] {
				errs = append(errs, rowError{i, "duplicate id"})
				continue
			}
			seen[*f.Id] = true
		}

		templateModes, ok := modes[f.FixtureTemplateId]
		if !ok {
			errs = append(errs, rowError{i, fmt.Sprintf("fixture template %q is not in this event", f.FixtureTemplateId)})
			continue
		}
		if !templateModes[f.ModeId] {
			errs = append(errs, rowError{i, fmt.Sprintf("mode %q is not in fixture template %q", f.ModeId, f.FixtureTemplateId)})
		}
	}
	return errs
}

// templateModes reads the event's template copies into template ID -> mode IDs.
func templateModes(templates datatypes.JSON) (map[string]map[string]bool, error) {
	var parsed []struct {
		Id    string `json:"id"`
		Modes []struct {
			Id string `json:"id"`
		} `json:"modes"`
	}
	if len(templates) > 0 {
		if err := json.Unmarshal(templates, &parsed); err != nil {
			return nil, err
		}
	}

	modes := map[string]map[string]bool{}
	for _, t := range parsed {
		ids := map[string]bool{}
		for _, m := range t.Modes {
			ids[m.Id] = true
		}
		modes[t.Id] = ids
	}
	return modes, nil
}

func fixtureFromRequest(f modelsv2.UpsertPatchedFixtureReq, eventId string) modelsv2.PatchedFixture {
	row := modelsv2.PatchedFixture{
		EventId:           eventId,
		FixtureTemplateId: f.FixtureTemplateId,
		ModeId:            f.ModeId,
		Name:              strings.TrimSpace(f.Name),
		PosX:              f.PosX,
		PosY:              f.PosY,
		PosZ:              f.PosZ,
		RotX:              f.RotX,
		RotY:              f.RotY,
		RotZ:              f.RotZ,
	}
	if f.Id != nil {
		row.Id = *f.Id
	}
	return row
}

func getPatchedFixtures(c *gin.Context) {
	eventId := eventscope.EventId(c)

	var fixtures []modelsv2.PatchedFixture
	if err := database.DB().
		Where("event_id = ?", eventId).
		Order("name ASC").
		Order("created_at ASC").
		Find(&fixtures).Error; err != nil {
		response.InternalError(c, "Failed to get patched fixtures")
		return
	}

	response.OK(c, map[string]any{
		"fixtures": fixtures,
	})
}
