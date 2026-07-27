package fixturegroupconfigurations

import (
	"fmt"
	"lighting-cue-maker/server/internal/models"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
)

func updateFixtureGroupConfiguration(c *gin.Context) {
	fixtureGroupId := c.Param("fixtureGroupId")
	if fixtureGroupId == "" {
		response.BadRequest(c, "Fixture group ID is required", nil)
		return
	}

	var fg models.FixtureGroupConfiguration
	if result := database.DB().Where("uuid = ?", fixtureGroupId).First(&fg); result.Error != nil {
		response.NotFound(c, "Fixture group configuration not found")
		return
	}

	var req models.UpdateFixtureGroupConfigurationReq
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Println(err)
		response.BadRequest(c, "Invalid request body", map[string]any{
			"request": req,
		})
		return
	}

	updates := map[string]any{}
	if req.Name != nil {
		if *req.Name == "" {
			response.BadRequest(c, "Fixture group name cannot be empty", nil)
			return
		}
		updates["name"] = *req.Name
	}

	if len(updates) > 0 {
		if result := database.DB().Model(&models.FixtureGroupConfiguration{}).Where("uuid = ?", fixtureGroupId).Updates(updates); result.Error != nil {
			response.InternalError(c, "Failed to update fixture group configuration")
			return
		}
	}

	var updatedFg models.FixtureGroupConfiguration
	if result := database.DB().Preload("Attributes").Where("uuid = ?", fixtureGroupId).First(&updatedFg); result.Error != nil {
		response.InternalError(c, "Failed to fetch updated fixture group configuration")
		return
	}

	fmt.Println("API PATCH /v1/fixture-group-config/:fixtureGroupId")

	response.OK(c, map[string]any{
		"fixtureGroup": updatedFg,
	})
}
