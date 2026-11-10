package cues

import (
	"encoding/json"
	"errors"
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

// requireItem stops the request unless :itemId is an item of the event in the URL.
func requireItem(c *gin.Context) {
	eventId := eventscope.EventId(c)
	itemId := c.Param("itemId")

	if _, err := uuid.Parse(itemId); err != nil {
		response.BadRequest(c, "Invalid item id", nil)
		c.Abort()
		return
	}

	var count int64
	if err := database.DB().Model(&modelsv2.Item{}).
		Where("event_id = ? AND id = ?", eventId, itemId).
		Count(&count).Error; err != nil {
		response.InternalError(c, "Failed to get item")
		c.Abort()
		return
	}
	if count == 0 {
		response.NotFound(c, "Item not found in this event")
		c.Abort()
		return
	}
	c.Next()
}

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

// deleteCue soft-deletes the cue. Restoring it brings it back.
func deleteCue(c *gin.Context) {
	itemId := c.Param("itemId")
	cueId := c.Param("cueId")

	if _, err := uuid.Parse(cueId); err != nil {
		response.BadRequest(c, "Invalid cue id", nil)
		return
	}

	result := database.DB().Where("item_id = ? AND id = ?", itemId, cueId).Delete(&modelsv2.Cue{})
	if result.Error != nil {
		response.InternalError(c, "Failed to delete cue")
		return
	}
	if result.RowsAffected == 0 {
		response.NotFound(c, "Cue not found in this item")
		return
	}

	response.OK(c, map[string]any{
		"deleted": true,
	})
}
