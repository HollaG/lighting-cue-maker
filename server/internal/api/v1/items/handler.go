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

	// get the light event (to get the ID)
	var event models.LightEvent
	// get the light event (to get the ID)
	if result := database.DB().Where("uuid = ?", eventUuid).First(&event); result.Error != nil {
		response.NotFound(c, "Event not found")
		return
	}

	// select all items with the light event id
	var items []models.Item
	if result := database.DB().Where("light_event_id = ?", event.ID).Find(&items); result.Error != nil {
		response.InternalError(c, "Failed to get items")
		return
	}

	fmt.Println("API GET /v1/events/:id/items")

	response.OK(c, map[string]any{
		"items": items,
	})
}

func createItem(c *gin.Context) {
	// :id is the parent event's UUID, set by the router
	eventUuid := c.Param("id")
	if eventUuid == "" {
		response.BadRequest(c, "Event ID is required", nil)
		return
	}

	// Verify the event actually exists and grab its primary key
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
		LightEventID: event.ID,
		Name:         req.Name,
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
