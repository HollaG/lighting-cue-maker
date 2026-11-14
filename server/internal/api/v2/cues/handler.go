package cues

import (
	"encoding/json"
	"errors"
	"strings"

	"lighting-cue-maker/server/internal/api/v2/timelines"
	modelsv2 "lighting-cue-maker/server/internal/models/v2"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// getCues lists the item's cues. Cue order comes from Item.RawLyrics, not from
// the database, so they come back oldest first and the client orders them.
func getCues(c *gin.Context) {
	itemId := c.Param("itemId")

	cues := []modelsv2.Cue{}
	if err := database.DB().
		Where("item_id = ?", itemId).
		Order("created_at ASC").
		Find(&cues).Error; err != nil {
		response.InternalError(c, "Failed to get cues")
		return
	}

	response.OK(c, map[string]any{
		"cues": cues,
	})
}

// upsertCue creates (no id) or updates (id) one cue of the item.
func upsertCue(c *gin.Context) {
	itemId := c.Param("itemId")

	var req modelsv2.UpsertCueReqBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}
	in := req.Cue

	row := modelsv2.Cue{
		ItemId: itemId,
		CueFields: modelsv2.CueFields{
			Transition:            datatypes.JSON(`{}`),
			ActiveFixtureGroupIds: datatypes.JSONSlice[string]{},
			SelectableIds:         datatypes.JSONSlice[string]{},
			Overrides:             datatypes.JSON(`{}`),
		},
	}
	if in.Id != nil {
		if _, err := uuid.Parse(*in.Id); err != nil {
			response.BadRequest(c, "Invalid cue id", nil)
			return
		}
		err := database.DB().Where("item_id = ? AND id = ?", itemId, *in.Id).First(&row).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.NotFound(c, "Cue not found in this item")
			return
		}
		if err != nil {
			response.InternalError(c, "Failed to get cue")
			return
		}
	}

	if in.Comments != nil {
		row.Comments = *in.Comments
	}
	if in.Transition != nil {
		if !isJSONObject(in.Transition) {
			response.BadRequest(c, "transition must be a JSON object", nil)
			return
		}
		row.Transition = in.Transition
	}
	if in.Mode != nil {
		row.Mode = strings.TrimSpace(*in.Mode)
	}
	if in.ActiveFixtureGroupIds != nil {
		row.ActiveFixtureGroupIds = dedupe(in.ActiveFixtureGroupIds)
	}
	if in.SelectableIds != nil {
		row.SelectableIds = dedupe(in.SelectableIds)
	}
	if in.Overrides != nil {
		if !isJSONObject(in.Overrides) {
			response.BadRequest(c, "overrides must be a JSON object", nil)
			return
		}
		row.Overrides = in.Overrides
	}

	var err error
	if in.Id == nil {
		err = database.DB().Create(&row).Error
	} else {
		// Select lists every editable column so empty values are written too.
		err = database.DB().Model(&row).
			Select("Comments", "Transition", "Mode", "ActiveFixtureGroupIds", "SelectableIds", "Overrides").
			Updates(&row).Error
	}
	if err != nil {
		response.InternalError(c, "Failed to save cue")
		return
	}
	if err := database.DB().First(&row, "id = ?", row.Id).Error; err != nil {
		response.InternalError(c, "Failed to get cue")
		return
	}

	response.OK(c, map[string]any{
		"cue": row,
	})
}

// isJSONObject reports whether raw is a JSON object ({...}), not null/array/scalar.
func isJSONObject(raw datatypes.JSON) bool {
	var m map[string]json.RawMessage
	return json.Unmarshal(raw, &m) == nil && m != nil
}

func dedupe(ids []string) datatypes.JSONSlice[string] {
	out := datatypes.JSONSlice[string]{}
	seen := map[string]bool{}
	for _, id := range ids {
		if !seen[id] {
			seen[id] = true
			out = append(out, id)
		}
	}
	return out
}

// errCueNotFound rolls back deleteCue's transaction when the cue isn't in the item.
var errCueNotFound = errors.New("cue not found")

// deleteCue soft-deletes the cue and, in the same transaction, removes its
// markers from the item's timelines. Restoring the cue brings it back, but not
// its markers.
func deleteCue(c *gin.Context) {
	itemId := c.Param("itemId")
	cueId := c.Param("cueId")

	if _, err := uuid.Parse(cueId); err != nil {
		response.BadRequest(c, "Invalid cue id", nil)
		return
	}

	err := database.DB().Transaction(func(tx *gorm.DB) error {
		result := tx.Where("item_id = ? AND id = ?", itemId, cueId).Delete(&modelsv2.Cue{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return errCueNotFound
		}
		return timelines.RemoveCueMarkers(tx, itemId, cueId)
	})
	if errors.Is(err, errCueNotFound) {
		response.NotFound(c, "Cue not found in this item")
		return
	}
	if err != nil {
		response.InternalError(c, "Failed to delete cue")
		return
	}

	response.OK(c, map[string]any{
		"deleted": true,
	})
}
