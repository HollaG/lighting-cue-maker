package fixtures

import (
	"errors"
	"fmt"
	"lighting-cue-maker/server/internal/models"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func getFixtures(c *gin.Context) {
	fixtureGroupId := c.Query("fixtureGroupId")
	eventId := c.Query("eventId")
	if fixtureGroupId == "" && eventId == "" {
		response.BadRequest(c, "Fixture group ID or event ID is required", nil)
		return
	}

	fixtures := []models.Fixture{}
	if fixtureGroupId != "" {
		var fixtureGroup models.FixtureGroupConfiguration
		result := database.DB().Where("uuid = ?", fixtureGroupId).First(&fixtureGroup)
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			response.NotFound(c, "Fixture group configuration not found")
			return
		}
		if result.Error != nil {
			response.InternalError(c, "Failed to get fixture group configuration")
			return
		}

		if result := database.DB().Where("fixture_group_configuration_uuid = ?", fixtureGroup.Uuid).Find(&fixtures); result.Error != nil {
			response.InternalError(c, "Failed to get fixtures")
			return
		}

		fmt.Println("API GET /v1/fixtures?fixtureGroupId=" + fixtureGroupId)
	} else {
		var event models.LightEvent
		result := database.DB().Select("uuid").Where("uuid = ?", eventId).First(&event)
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			response.NotFound(c, "Event not found")
			return
		}
		if result.Error != nil {
			response.InternalError(c, "Failed to get event")
			return
		}

		fixtureGroupIds := database.DB().
			Model(&models.FixtureGroupConfiguration{}).
			Select("uuid").
			Where("light_event_uuid = ?", event.Uuid)
		if result := database.DB().
			Where("fixture_group_configuration_uuid IN (?)", fixtureGroupIds).
			Find(&fixtures); result.Error != nil {
			response.InternalError(c, "Failed to get fixtures")
			return
		}

		fmt.Println("API GET /v1/fixtures?eventId=" + eventId)
	}

	response.OK(c, map[string]any{
		"fixtures": fixtures,
	})
}

func upsertFixture(c *gin.Context) {
	var req models.UpsertFixtureReq
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Println(err)
		response.BadRequest(c, "Invalid request body", map[string]any{
			"request": req,
		})
		return
	}

	if req.FixtureGroupId == "" {
		response.BadRequest(c, "Fixture group ID is required", nil)
		return
	}
	// if req.Name == "" {
	// 	response.BadRequest(c, "Fixture name is required", nil)
	// 	return
	// }
	// if req.Type == "" {
	// 	response.BadRequest(c, "Fixture type is required", nil)
	// 	return
	// }

	var fixtureGroup models.FixtureGroupConfiguration
	result := database.DB().Where("uuid = ?", req.FixtureGroupId).First(&fixtureGroup)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		response.NotFound(c, "Fixture group configuration not found")
		return
	}
	if result.Error != nil {
		response.InternalError(c, "Failed to get fixture group configuration")
		return
	}

	if req.ID == "" {
		fixture := fixtureFromRequest(req, fixtureGroup.Uuid)
		if result := database.DB().Create(&fixture); result.Error != nil {
			response.InternalError(c, "Failed to create fixture")
			return
		}

		fmt.Println("API PUT /v1/fixtures")
		response.Created(c, map[string]any{
			"fixture": fixture,
		})
		return
	}

	var fixture models.Fixture
	result = database.DB().Where(
		"uuid = ? AND fixture_group_configuration_uuid = ?",
		req.ID,
		fixtureGroup.Uuid,
	).First(&fixture)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		response.NotFound(c, "Fixture not found in fixture group")
		return
	}
	if result.Error != nil {
		response.InternalError(c, "Failed to get fixture")
		return
	}

	if req.Name != "" {
		fixture.Name = req.Name
	}
	if req.Type != "" {
		fixture.Type = req.Type
	}
	if req.PosX != 0 {
		fixture.PosX = req.PosX
	}
	if req.PosY != 0 {
		fixture.PosY = req.PosY
	}
	if req.PosZ != 0 {
		fixture.PosZ = req.PosZ
	}
	if req.RotX != 0 {
		fixture.RotX = req.RotX
	}
	if req.RotY != 0 {
		fixture.RotY = req.RotY
	}
	if req.RotZ != 0 {
		fixture.RotZ = req.RotZ
	}
	if req.BeamAngle != 0 {
		fixture.BeamAngle = req.BeamAngle
	}
	// fixture.Name = req.Name
	// fixture.Type = req.Type
	// fixture.PosX = req.PosX
	// fixture.PosY = req.PosY
	// fixture.PosZ = req.PosZ
	// fixture.RotX = req.RotX
	// fixture.RotY = req.RotY
	// fixture.RotZ = req.RotZ
	// fixture.BeamAngle = req.BeamAngle

	if result := database.DB().Save(&fixture); result.Error != nil {
		response.InternalError(c, "Failed to update fixture")
		return
	}

	fmt.Println("API PUT /v1/fixtures")
	response.OK(c, map[string]any{
		"fixture": fixture,
	})
}

func deleteFixture(c *gin.Context) {
	fixtureId := c.Param("fixtureId")
	if fixtureId == "" {
		response.BadRequest(c, "Fixture ID is required", nil)
		return
	}

	var fixture models.Fixture
	result := database.DB().Where("uuid = ?", fixtureId).First(&fixture)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		response.NotFound(c, "Fixture not found")
		return
	}
	if result.Error != nil {
		response.InternalError(c, "Failed to get fixture")
		return
	}

	if result := database.DB().Delete(&fixture); result.Error != nil {
		response.InternalError(c, "Failed to delete fixture")
		return
	}

	fmt.Println("API DELETE /v1/fixtures/:fixtureId")
	response.OK(c, map[string]any{
		"message": "Fixture deleted",
	})
}

func fixtureFromRequest(req models.UpsertFixtureReq, fixtureGroupId string) models.Fixture {
	return models.Fixture{
		FixtureGroupConfigurationUuid: fixtureGroupId,
		Name:                          req.Name,
		Type:                          req.Type,
		PosX:                          req.PosX,
		PosY:                          req.PosY,
		PosZ:                          req.PosZ,
		RotX:                          req.RotX,
		RotY:                          req.RotY,
		RotZ:                          req.RotZ,
		BeamAngle:                     req.BeamAngle,
	}
}
