package bumps

import (
	"encoding/json"
	"fmt"
	"lighting-cue-maker/server/internal/models"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

// get the list of bumps belonging to an item
func getBumps(c *gin.Context) {
	itemUuid := c.Query("itemId")
	if itemUuid == "" {
		response.BadRequest(c, "Item ID is required", nil)
		return
	}

	var bumps []models.Bump
	if result := database.DB().Where("item_uuid = ?", itemUuid).Find(&bumps); result.Error != nil {
		response.InternalError(c, "Failed to get bumps")
		return
	}

	fmt.Println("API GET /v1/bumps?itemId=" + itemUuid)

	response.OK(c, map[string]any{
		"bumps": bumps,
	})
}

func createBump(c *gin.Context) {
	var createReq models.CreateBumpReq
	_ = c.ShouldBindJSON(&createReq)

	itemId := createReq.ItemId
	if itemId == "" {
		itemId = c.Query("itemId")
	}

	if itemId == "" {
		response.BadRequest(c, "Item ID is required", nil)
		return
	}

	bumpId := createReq.BumpConfigurationId
	if bumpId == "" {
		bumpId = c.Query("bumpConfigurationId")
	}
	if bumpId == "" {
		response.BadRequest(c, "Bump ID is required", nil)
		return
	}

	assignmentsBytes, err := json.Marshal(map[string]any{})
	if err != nil {
		response.BadRequest(c, "Failed to parse assignments JSON", nil)
		return
	}

	bump := models.Bump{
		ItemUuid:              itemId,
		BumpConfigurationUuid: bumpId,
		Assignments:           datatypes.JSON(assignmentsBytes),
		Comments:              "",
	}

	if result := database.DB().Create(&bump); result.Error != nil {
		response.InternalError(c, "Failed to create bump")
		return
	}

	fmt.Println("API POST /v1/bumps")

	response.OK(c, map[string]any{
		"bump": bump,
	})
}

func updateBump(c *gin.Context) {
	bumpUuid := c.Param("bumpId")
	if bumpUuid == "" {
		response.BadRequest(c, "Bump ID is required", nil)
		return
	}

	var bump models.Bump
	if result := database.DB().Where("uuid = ?", bumpUuid).First(&bump); result.Error != nil {
		response.NotFound(c, "Bump not found")
		return
	}

	var req models.UpdateBumpReq
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Println(err)
		response.BadRequest(c, "Invalid request body", map[string]any{
			"request": req,
		})
		return
	}

	updates := map[string]any{}
	if req.Comments != nil {
		updates["comments"] = *req.Comments
	}
	if req.Assignments != nil {
		updates["assignments"] = *req.Assignments
	}

	if req.BumpConfigurationId != nil {
		updates["bump_configuration_uuid"] = *req.BumpConfigurationId
	}

	if len(updates) > 0 {
		if result := database.DB().Model(&models.Bump{}).Where("uuid = ?", bumpUuid).Updates(updates); result.Error != nil {
			response.InternalError(c, "Failed to update bump")
			return
		}
	}

	var updatedBump models.Bump
	if result := database.DB().Where("uuid = ?", bumpUuid).First(&updatedBump); result.Error != nil {
		response.InternalError(c, "Failed to fetch updated bump")
		return
	}

	fmt.Println("API PATCH /v1/bumps/:bumpId")

	response.OK(c, map[string]any{
		"bump": updatedBump,
	})
}

func deleteBump(c *gin.Context) {
	bumpUuid := c.Param("bumpId")
	if bumpUuid == "" {
		response.BadRequest(c, "Bump ID is required", nil)
		return
	}

	var bump models.Bump
	if result := database.DB().Where("uuid = ?", bumpUuid).First(&bump); result.Error != nil {
		response.NotFound(c, "Bump not found")
		return
	}

	if result := database.DB().Delete(&bump); result.Error != nil {
		response.InternalError(c, "Failed to delete bump")
		return
	}

	fmt.Println("API DELETE /v1/bumps/:bumpId")

	response.OK(c, map[string]any{
		"message": "Bump deleted",
	})
}
