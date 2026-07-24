package bumps

import (
	"fmt"
	"lighting-cue-maker/server/internal/models"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
)

func createBump(c *gin.Context) {
	var req models.CreateBumpConfigurationReq
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Println(err)
		response.BadRequest(c, "Invalid request body", map[string]any{
			"request": req,
		})
		return
	}

	eventUuid := req.EventId
	if eventUuid == "" {
		eventUuid = c.Query("eventId")
	}
	if eventUuid == "" {
		response.BadRequest(c, "Event ID is required", nil)
		return
	}

	if req.Name == "" {
		response.BadRequest(c, "Name is required", nil)
		return
	}

	// Verify event exists
	var event models.LightEvent
	if result := database.DB().Where("uuid = ?", eventUuid).First(&event); result.Error != nil {
		response.NotFound(c, "Event not found")
		return
	}

	bump := models.BumpConfiguration{
		LightEventUuid: event.Uuid,
		Name:           req.Name,
	}

	if result := database.DB().Create(&bump); result.Error != nil {
		response.InternalError(c, "Failed to create bump configuration")
		return
	}

	fmt.Println("API POST /v1/bumps")

	response.OK(c, map[string]any{
		"bump": bump,
	})
}

func getBumps(c *gin.Context) {
	eventUuid := c.Query("eventId")
	if eventUuid == "" {
		response.BadRequest(c, "Event ID is required", nil)
		return
	}

	// Verify event exists
	var event models.LightEvent
	if result := database.DB().Where("uuid = ?", eventUuid).First(&event); result.Error != nil {
		response.NotFound(c, "Event not found")
		return
	}

	var bumps []models.BumpConfiguration
	if result := database.DB().Where("light_event_uuid = ?", event.Uuid).Find(&bumps); result.Error != nil {
		response.InternalError(c, "Failed to get bump configurations")
		return
	}

	fmt.Println("API GET /v1/bumps?eventId=" + eventUuid)

	response.OK(c, map[string]any{
		"bumps": bumps,
	})
}

func deleteBump(c *gin.Context) {
	bumpUuid := c.Param("bumpId")
	if bumpUuid == "" {
		response.BadRequest(c, "Bump ID is required", nil)
		return
	}

	var bump models.BumpConfiguration
	if result := database.DB().Where("uuid = ?", bumpUuid).First(&bump); result.Error != nil {
		response.NotFound(c, "Bump configuration not found")
		return
	}

	if result := database.DB().Delete(&bump); result.Error != nil {
		response.InternalError(c, "Failed to delete bump configuration")
		return
	}

	fmt.Println("API DELETE /v1/bumps/:bumpId")

	response.OK(c, map[string]any{
		"message": "Bump configuration deleted",
	})
}
