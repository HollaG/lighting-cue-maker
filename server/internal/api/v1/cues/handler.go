package cues

import (
	"encoding/json"
	"fmt"
	"io"
	"lighting-cue-maker/server/internal/models"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

// get the list of cues belonging to an item
func getCues(c *gin.Context) {
	itemUuid := c.Query("itemId")
	if itemUuid == "" {
		response.BadRequest(c, "Item ID is required", nil)
		return
	}

	var cues []models.Cue
	if result := database.DB().Where("item_uuid = ?", itemUuid).Find(&cues); result.Error != nil {
		response.InternalError(c, "Failed to get cues")
		return
	}

	fmt.Println("API GET /v1/cues?itemId=" + itemUuid)

	response.OK(c, map[string]any{
		"cues": cues,
	})
}

func createCue(c *gin.Context) {
	var createReq models.CreateCueReq
	// An empty body is supported when itemId is supplied through the query string.
	if err := c.ShouldBindJSON(&createReq); err != nil && err != io.EOF {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	itemId := createReq.ItemId
	if itemId == "" {
		itemId = c.Query("itemId")
	}

	if itemId == "" {
		response.BadRequest(c, "Item ID is required", nil)
		return
	}

	assignmentsBytes, err := json.Marshal(map[string]any{})
	if err != nil {
		response.BadRequest(c, "Failed to parse assignments JSON", nil)
		return
	}
	cueConfig := createReq.CueConfig
	if len(cueConfig) == 0 || string(cueConfig) == "null" {
		cueConfig = datatypes.JSON([]byte(`{"mode":"unknown"}`))
	}
	transition := createReq.Transition
	if len(transition) == 0 || string(transition) == "null" {
		transition = datatypes.JSON([]byte(`{"holdTimeMs":-1,"transitionTimeMs":0}`))
	}

	cue := models.Cue{
		ItemUuid:    itemId,
		Assignments: datatypes.JSON(assignmentsBytes),
		CueConfig:   cueConfig,
		Transition:  transition,
		Comments:    "",
		UpdatedBy:   createReq.UpdatedBy,
	}

	if result := database.DB().Create(&cue); result.Error != nil {
		response.InternalError(c, "Failed to create cue")
		return
	}

	fmt.Println("API POST /v1/cues")

	response.Created(c, map[string]any{
		"cue": cue,
	})
}

func updateCue(c *gin.Context) {
	cueUuid := c.Param("cueId")
	if cueUuid == "" {
		response.BadRequest(c, "Cue ID is required", nil)
		return
	}

	var cue models.Cue
	if result := database.DB().Where("uuid = ?", cueUuid).First(&cue); result.Error != nil {
		response.NotFound(c, "Cue not found")
		return
	}

	var req models.UpdateCueReq
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
	if len(req.CueConfig) > 0 && string(req.CueConfig) != "null" {
		updates["cue_config"] = req.CueConfig
	}
	if len(req.Transition) > 0 && string(req.Transition) != "null" {
		updates["transition"] = req.Transition
	}
	if req.UpdatedBy != nil {
		updates["updated_by"] = *req.UpdatedBy
	}

	if len(updates) > 0 {
		if result := database.DB().Model(&models.Cue{}).Where("uuid = ?", cueUuid).Updates(updates); result.Error != nil {
			response.InternalError(c, "Failed to update cue")
			return
		}
	}

	var updatedCue models.Cue
	if result := database.DB().Where("uuid = ?", cueUuid).First(&updatedCue); result.Error != nil {
		response.InternalError(c, "Failed to fetch updated cue")
		return
	}

	fmt.Println("API PATCH /v1/cues/:cueId")

	response.OK(c, map[string]any{
		"cue": updatedCue,
	})
}

func deleteCue(c *gin.Context) {
	cueUuid := c.Param("cueId")
	if cueUuid == "" {
		response.BadRequest(c, "Cue ID is required", nil)
		return
	}

	var cue models.Cue
	if result := database.DB().Where("uuid = ?", cueUuid).First(&cue); result.Error != nil {
		response.NotFound(c, "Cue not found")
		return
	}

	if result := database.DB().Delete(&cue); result.Error != nil {
		response.InternalError(c, "Failed to delete cue")
		return
	}

	fmt.Println("API DELETE /v1/cues/:cueId")

	response.OK(c, map[string]any{
		"message": "Cue deleted",
	})
}
