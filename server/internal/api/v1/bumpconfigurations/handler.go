package bumpconfigurations

import (
	"fmt"
	"lighting-cue-maker/server/internal/models"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
)

func createBumpConfiguration(c *gin.Context) {
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

	bumpConfig := models.BumpConfiguration{
		LightEventUuid: event.Uuid,
		Name:           req.Name,
		Description:    req.Description,
	}

	if result := database.DB().Create(&bumpConfig); result.Error != nil {
		response.InternalError(c, "Failed to create bump configuration")
		return
	}

	fmt.Println("API POST /v1/bump-configurations")

	response.OK(c, map[string]any{
		"bumpConfiguration": bumpConfig,
	})
}

func getBumpConfigurations(c *gin.Context) {
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

	var bumpConfigs []models.BumpConfiguration
	if result := database.DB().Where("light_event_uuid = ?", event.Uuid).Find(&bumpConfigs); result.Error != nil {
		response.InternalError(c, "Failed to get bump configurations")
		return
	}

	fmt.Println("API GET /v1/bump-configurations?eventId=" + eventUuid)

	response.OK(c, map[string]any{
		"bumpConfigurations": bumpConfigs,
	})
}

func updateBumpConfiguration(c *gin.Context) {
	bumpConfigUuid := c.Param("bumpConfigurationId")
	if bumpConfigUuid == "" {
		response.BadRequest(c, "Bump configuration ID is required", nil)
		return
	}

	var bumpConfig models.BumpConfiguration
	if result := database.DB().Where("uuid = ?", bumpConfigUuid).First(&bumpConfig); result.Error != nil {
		response.NotFound(c, "Bump configuration not found")
		return
	}

	var req models.UpdateBumpConfigurationReq
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Println(err)
		response.BadRequest(c, "Invalid request body", map[string]any{
			"request": req,
		})
		return
	}

	updates := map[string]any{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}

	if len(updates) > 0 {
		if result := database.DB().Model(&models.BumpConfiguration{}).Where("uuid = ?", bumpConfigUuid).Updates(updates); result.Error != nil {
			response.InternalError(c, "Failed to update bump configuration")
			return
		}
	}

	var updatedBumpConfig models.BumpConfiguration
	if result := database.DB().Where("uuid = ?", bumpConfigUuid).First(&updatedBumpConfig); result.Error != nil {
		response.InternalError(c, "Failed to fetch updated bump configuration")
		return
	}

	fmt.Println("API PATCH /v1/bump-configurations/:bumpConfigurationId")

	response.OK(c, map[string]any{
		"bumpConfiguration": updatedBumpConfig,
	})
}

func deleteBumpConfiguration(c *gin.Context) {
	bumpConfigUuid := c.Param("bumpConfigurationId")
	if bumpConfigUuid == "" {
		response.BadRequest(c, "Bump configuration ID is required", nil)
		return
	}

	var bumpConfig models.BumpConfiguration
	if result := database.DB().Where("uuid = ?", bumpConfigUuid).First(&bumpConfig); result.Error != nil {
		response.NotFound(c, "Bump configuration not found")
		return
	}

	if result := database.DB().Delete(&bumpConfig); result.Error != nil {
		response.InternalError(c, "Failed to delete bump configuration")
		return
	}

	fmt.Println("API DELETE /v1/bump-configurations/:bumpConfigurationId")

	response.OK(c, map[string]any{
		"message": "Bump configuration deleted",
	})
}
