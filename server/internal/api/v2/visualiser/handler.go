package visualiser

import (
	"encoding/json"
	"errors"

	"lighting-cue-maker/server/internal/api/v2/eventscope"
	modelsv2 "lighting-cue-maker/server/internal/models/v2"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// upsertVisualiser creates the event's visualiser (with defaults), or restores
// or updates it. Fields left out of the request keep their current value.
func upsertVisualiser(c *gin.Context) {
	eventId := eventscope.EventId(c)

	var req modelsv2.UpsertVisualiserBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}
	v := req.Visualiser

	if len(v.Config3d) > 0 && !isJSONObject(v.Config3d) {
		response.BadRequest(c, "config3d must be a JSON object", nil)
		return
	}
	if len(v.Objects3d) > 0 && !isJSONArray(v.Objects3d) {
		response.BadRequest(c, "objects3d must be a JSON array", nil)
		return
	}
	if len(v.DefaultCameraView) > 0 && !isJSONObject(v.DefaultCameraView) {
		response.BadRequest(c, "defaultCameraView must be a JSON object", nil)
		return
	}

	saved, err := findOrCreateVisualiser(eventId)
	if err != nil {
		response.InternalError(c, "Failed to get visualiser")
		return
	}

	updateFields := []string{}
	if len(v.Config3d) > 0 {
		saved.Config3d = v.Config3d
		updateFields = append(updateFields, "Config3d")
	}
	if len(v.Objects3d) > 0 {
		saved.Objects3d = v.Objects3d
		updateFields = append(updateFields, "Objects3d")
	}
	if len(v.DefaultCameraView) > 0 {
		saved.DefaultCameraView = v.DefaultCameraView
		updateFields = append(updateFields, "DefaultCameraView")
	}
	if len(updateFields) > 0 {
		if err := database.DB().Model(&saved).Select(updateFields).Updates(&saved).Error; err != nil {
			response.InternalError(c, "Failed to update visualiser")
			return
		}
		if err := database.DB().First(&saved, "id = ?", saved.Id).Error; err != nil {
			response.InternalError(c, "Failed to get visualiser")
			return
		}
	}

	response.OK(c, map[string]any{
		"visualiser": saved,
	})
}

// getVisualiser returns the event's visualiser, creating one with defaults the
// first time, so every event always has one.
func getVisualiser(c *gin.Context) {
	eventId := eventscope.EventId(c)

	visualiser, err := findOrCreateVisualiser(eventId)
	if err != nil {
		response.InternalError(c, "Failed to get visualiser")
		return
	}

	response.OK(c, map[string]any{
		"visualiser": visualiser,
	})
}

// defaultConfig3d matches the v1 defaults for a new scene.
var defaultConfig3d = datatypes.JSON(`{"haze":0.5,"ambientLight":0.5}`)

// findOrCreateVisualiser returns the event's visualiser.
//   - none yet: creates one with defaults;
//   - soft-deleted: restores it (the unique event_id index still holds the old row);
//   - two requests creating at once: ON CONFLICT DO NOTHING, then both read the same row.
func findOrCreateVisualiser(eventId string) (modelsv2.Visualiser, error) {
	db := database.DB()

	var visualiser modelsv2.Visualiser
	err := db.Unscoped().Where("event_id = ?", eventId).First(&visualiser).Error
	if err == nil {
		if visualiser.DeletedAt.Valid {
			if err := db.Unscoped().Model(&visualiser).Update("deleted_at", nil).Error; err != nil {
				return visualiser, err
			}
			visualiser.DeletedAt = gorm.DeletedAt{}
		}
		return visualiser, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return visualiser, err
	}

	visualiser = modelsv2.Visualiser{
		EventId:   eventId,
		Config3d:  defaultConfig3d,
		Objects3d: datatypes.JSON(`[]`),
	}
	if err := db.Clauses(clause.OnConflict{DoNothing: true}).Create(&visualiser).Error; err != nil {
		return visualiser, err
	}
	// Re-read: covers the case where another request created it first.
	err = db.Where("event_id = ?", eventId).First(&visualiser).Error
	return visualiser, err
}

func isJSONArray(value datatypes.JSON) bool {
	var items []json.RawMessage
	return json.Unmarshal(value, &items) == nil && items != nil
}

func isJSONObject(value datatypes.JSON) bool {
	var object map[string]json.RawMessage
	return json.Unmarshal(value, &object) == nil && object != nil
}
