package items

import (
	"errors"
	"strings"

	"lighting-cue-maker/server/internal/api/v2/eventscope"
	modelsv2 "lighting-cue-maker/server/internal/models/v2"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// getItems lists the event's items without lyrics or cues. No order field yet,
// so they come back oldest first.
func getItems(c *gin.Context) {
	eventId := eventscope.EventId(c)

	items := []modelsv2.ItemOverview{}
	if err := database.DB().Model(&modelsv2.Item{}).
		Select("id", "event_id", "name", "comments", "created_at", "updated_at").
		Where("event_id = ?", eventId).
		Order("created_at ASC").
		Find(&items).Error; err != nil {
		response.InternalError(c, "Failed to get items")
		return
	}

	response.OK(c, map[string]any{
		"items": items,
	})
}

// getItem returns one item of the event, with its cues.
func getItem(c *gin.Context) {
	eventId := eventscope.EventId(c)
	itemId := c.Param("itemId")

	if _, err := uuid.Parse(itemId); err != nil {
		response.BadRequest(c, "Invalid item id", nil)
		return
	}

	var item modelsv2.Item
	err := database.DB().
		Where("event_id = ? AND id = ?", eventId, itemId).
		First(&item).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		response.NotFound(c, "Item not found in this event")
		return
	}
	if err != nil {
		response.InternalError(c, "Failed to get item")
		return
	}

	response.OK(c, map[string]any{
		"item": item,
	})
}

// upsertItem creates (no id) or updates (id) one item of the event.
func upsertItem(c *gin.Context) {
	eventId := eventscope.EventId(c)

	var req modelsv2.UpsertItemReqBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}
	in := req.Item

	row := modelsv2.Item{EventId: eventId}
	if in.Id != nil {
		if _, err := uuid.Parse(*in.Id); err != nil {
			response.BadRequest(c, "Invalid item id", nil)
			return
		}
		err := database.DB().Where("event_id = ? AND id = ?", eventId, *in.Id).First(&row).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.NotFound(c, "Item not found in this event")
			return
		}
		if err != nil {
			response.InternalError(c, "Failed to get item")
			return
		}
	}

	if in.Name != nil {
		row.Name = strings.TrimSpace(*in.Name)
	}
	if in.Comments != nil {
		row.Comments = *in.Comments
	}
	if in.RawLyrics != nil {
		row.RawLyrics = *in.RawLyrics
	}
	if row.Name == "" {
		response.BadRequest(c, "name is required", nil)
		return
	}

	var err error
	if in.Id == nil {
		err = database.DB().Create(&row).Error
	} else {
		// Select lists every editable column so empty strings are written too.
		err = database.DB().Model(&row).
			Select("Name", "Comments", "RawLyrics").
			Updates(&row).Error
	}
	if err != nil {
		response.InternalError(c, "Failed to save item")
		return
	}
	if err := database.DB().First(&row, "id = ?", row.Id).Error; err != nil {
		response.InternalError(c, "Failed to get item")
		return
	}

	response.OK(c, map[string]any{
		"item": row,
	})
}

// deleteItem soft-deletes the item. Its cues stay, so restoring it brings
// them back.
func deleteItem(c *gin.Context) {
	eventId := eventscope.EventId(c)
	itemId := c.Param("itemId")

	if _, err := uuid.Parse(itemId); err != nil {
		response.BadRequest(c, "Invalid item id", nil)
		return
	}

	result := database.DB().Where("event_id = ? AND id = ?", eventId, itemId).Delete(&modelsv2.Item{})
	if result.Error != nil {
		response.InternalError(c, "Failed to delete item")
		return
	}
	if result.RowsAffected == 0 {
		response.NotFound(c, "Item not found in this event")
		return
	}

	response.OK(c, map[string]any{
		"deleted": true,
	})
}
