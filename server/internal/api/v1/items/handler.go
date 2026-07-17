package items

import (
	"fmt"
	"lighting-cue-maker/server/internal/models"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
)

func getItems(c *gin.Context) {
	eventUuid := c.Param("id")
	if eventUuid == "" {
		response.BadRequest(c, "Event ID is required", nil)
		return
	}

	// verify the event exists
	var event models.LightEvent
	if result := database.DB().Where("uuid = ?", eventUuid).First(&event); result.Error != nil {
		response.NotFound(c, "Event not found")
		return
	}

	// select all items belonging to this event
	var items []models.Item
	if result := database.DB().Where("light_event_uuid = ?", event.Uuid).Find(&items); result.Error != nil {
		response.InternalError(c, "Failed to get items")
		return
	}

	fmt.Println("API GET /v1/events/:id/items")

	response.OK(c, map[string]any{
		"items": items,
	})
}

func getItem(c *gin.Context) {
	eventUuid := c.Param("id")
	if eventUuid == "" {
		response.BadRequest(c, "Event ID is required", nil)
		return
	}

	itemUuid := c.Param("itemId")
	if itemUuid == "" {
		response.BadRequest(c, "Item ID is required", nil)
		return
	}

	// verify the event exists
	var event models.LightEvent
	if result := database.DB().Where("uuid = ?", eventUuid).First(&event); result.Error != nil {
		response.NotFound(c, "Event not found")
		return
	}

	// verify the item exists
	var item models.Item
	if result := database.DB().Where("uuid = ?", itemUuid).First(&item); result.Error != nil {
		response.NotFound(c, "Item not found")
		return
	}

	fmt.Println("API GET /v1/events/:id/items/:itemId")

	response.OK(c, map[string]any{
		"item": item,
	})
}

func createItem(c *gin.Context) {
	// :id is the parent event's UUID, set by the router
	eventUuid := c.Param("id")
	if eventUuid == "" {
		response.BadRequest(c, "Event ID is required", nil)
		return
	}

	// Verify the event actually exists
	var event models.LightEvent
	if result := database.DB().Where("uuid = ?", eventUuid).First(&event); result.Error != nil {
		response.NotFound(c, "Event not found")
		return
	}

	var req models.CreateItemReq
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Println(err)
		response.BadRequest(c, "Invalid request body", map[string]any{
			"request": req,
		})
		return
	}

	if req.Name == "" {
		response.BadRequest(c, "Name is required", nil)
		return
	}

	if len(req.Name) > 64 {
		response.BadRequest(c, "Name must be less than 64 characters", nil)
		return
	}

	item := models.Item{
		LightEventUuid: event.Uuid,
		Name:           req.Name,
		// RawLyrics and Content are intentionally omitted — they default to "" and nil
	}

	result := database.DB().Create(&item)
	if result.Error != nil {
		response.InternalError(c, "Failed to create item")
		return
	}

	fmt.Println("API POST /v1/events/:id/items")

	response.OK(c, map[string]any{
		"item": item,
	})
}

func updateItem(c *gin.Context) {
	eventUuid := c.Param("id")
	itemUuid := c.Param("itemId")

	// all fields are optional
	// Verify the event actually exists
	var event models.LightEvent
	if result := database.DB().Where("uuid = ?", eventUuid).First(&event); result.Error != nil {
		response.NotFound(c, "Event not found")
		return
	}

	var req models.UpdateItemReq
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Println(err)
		response.BadRequest(c, "Invalid request body", map[string]any{
			"request": req,
		})
		return
	}

	// Build a map of only the fields that were provided, to avoid GORM
	// struct-vs-model schema mismatches and accidental zero-value writes.
	updates := map[string]any{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.RawLyrics != nil {
		updates["raw_lyrics"] = *req.RawLyrics
	}
	if req.Content != nil {
		updates["content"] = req.Content
	}

	if len(updates) > 0 {
		if result := database.DB().Model(&models.Item{}).Where("uuid = ?", itemUuid).Updates(updates); result.Error != nil {
			response.InternalError(c, "Failed to update item")
			return
		}
	}

	// Re-fetch the full item from DB so the response reflects the persisted state.
	var updatedItem models.Item
	if result := database.DB().Where("uuid = ?", itemUuid).First(&updatedItem); result.Error != nil {
		response.InternalError(c, "Failed to fetch updated item")
		return
	}

	fmt.Println("API PATCH /v1/events/:id/items/:itemId")

	response.OK(c, map[string]any{
		"item": updatedItem,
	})
}

func createCue(c *gin.Context) {
	// eventUuid := c.Param("id")
	itemUuid := c.Param("itemId")

	cue := models.Cue{
		ItemUuid: itemUuid,
		// Assignments: map[string]any{},
		Comments: "",
	}

	database.DB().Create(&cue)

	fmt.Println("API POST /v1/events/:id/items/:itemId/cues")

	response.OK(c, map[string]any{
		"cue": cue,
	})
}
