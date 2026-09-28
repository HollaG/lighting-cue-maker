package alternatecues

import (
	"encoding/json"
	"errors"

	"lighting-cue-maker/server/internal/models"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

func getAlternateCues(c *gin.Context) {
	itemID, cueID := c.Query("itemId"), c.Query("cueId")
	if (itemID == "") == (cueID == "") {
		response.BadRequest(c, "Provide either itemId or cueId", nil)
		return
	}

	alternates := []models.AlternateCue{}
	query := database.DB().Model(&models.AlternateCue{})
	if itemID != "" {
		if err := uuid.Validate(itemID); err != nil {
			response.BadRequest(c, "Invalid item ID", nil)
			return
		}
		var item models.Item
		err := database.DB().Select("uuid").Where("uuid = ?", itemID).First(&item).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.NotFound(c, "Item not found")
			return
		}
		if err != nil {
			response.InternalError(c, "Failed to get item")
			return
		}
		query = query.Joins("JOIN cues ON cues.uuid = alternate_cues.cue_uuid").
			Where("cues.item_uuid = ? AND cues.deleted_at IS NULL", itemID)
	} else {
		if !validateParentCue(c, cueID) {
			return
		}
		query = query.Where("cue_uuid = ?", cueID)
	}

	if err := query.Order("alternate_cues.created_at ASC").
		Order("alternate_cues.uuid ASC").Find(&alternates).Error; err != nil {
		response.InternalError(c, "Failed to get alternate cues")
		return
	}

	response.OK(c, map[string]any{"alternateCues": alternates})
}

func upsertAlternateCue(c *gin.Context) {
	alternateID := c.Param("alternateId")
	if alternateID != "" {
		if err := uuid.Validate(alternateID); err != nil {
			response.BadRequest(c, "Invalid alternate ID", nil)
			return
		}
	}

	var req models.UpsertAlternateCueReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}
	alternate := models.AlternateCue{
		Type:        models.AlternateCueTypeNormal,
		Assignments: datatypes.JSON([]byte(`{}`)),
		CueConfig:   datatypes.JSON([]byte(`{"mode":"unknown"}`)),
		Transition:  datatypes.JSON([]byte(`{"holdTimeMs":-1,"transitionTimeMs":0}`)),
	}
	if alternateID != "" {
		err := database.DB().Where("uuid = ?", alternateID).First(&alternate).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.NotFound(c, "Alternate cue not found")
			return
		}
		if err != nil {
			response.InternalError(c, "Failed to get alternate cue")
			return
		}
		if req.Id != "" && req.Id != alternate.CueUuid {
			response.BadRequest(c, "Cue ID does not match alternate cue", nil)
			return
		}
	} else {
		if req.Id == "" {
			response.BadRequest(c, "Cue ID is required", nil)
			return
		}
		alternate.CueUuid = req.Id
	}
	if !validateParentCue(c, alternate.CueUuid) {
		return
	}
	previous := alternate

	// Select only supplied fields so partial updates preserve omitted values,
	// while explicit empty strings and empty assignments can still clear them.
	fields := []string{}
	if req.AlternateName != nil {
		alternate.Name = *req.AlternateName
		fields = append(fields, "Name")
	}
	if req.AlternateType != nil {
		alternate.Type = *req.AlternateType
		fields = append(fields, "Type")
	}
	if req.Assignments != nil {
		assignments, err := json.Marshal(*req.Assignments)
		if err != nil {
			response.BadRequest(c, "Invalid assignments", nil)
			return
		}
		alternate.Assignments = datatypes.JSON(assignments)
		fields = append(fields, "Assignments")
	}
	if req.Comments != nil {
		alternate.Comments = *req.Comments
		fields = append(fields, "Comments")
	}
	if len(req.CueConfig) > 0 && string(req.CueConfig) != "null" {
		alternate.CueConfig = req.CueConfig
		fields = append(fields, "CueConfig")
	}
	if len(req.Transition) > 0 && string(req.Transition) != "null" {
		alternate.Transition = req.Transition
		fields = append(fields, "Transition")
	}
	if req.UpdatedBy != nil {
		alternate.UpdatedBy = req.UpdatedBy
		fields = append(fields, "UpdatedBy")
	}

	if alternateID == "" {
		if err := database.DB().Create(&alternate).Error; err != nil {
			response.InternalError(c, "Failed to create alternate cue")
			return
		}
		response.Created(c, map[string]any{"alternateCue": alternate})
		return
	}

	if len(fields) > 0 {
		if err := database.DB().Model(&alternate).Select(fields).Updates(&alternate).Error; err != nil {
			response.InternalError(c, "Failed to update alternate cue")
			return
		}
	}
	response.OK(c, map[string]any{"alternateCue": alternate, "previous": previous})
}

// Both endpoints require an existing, non-deleted parent cue.
func validateParentCue(c *gin.Context, cueID string) bool {
	if err := uuid.Validate(cueID); err != nil {
		response.BadRequest(c, "Invalid cue ID", nil)
		return false
	}

	var cue models.Cue
	err := database.DB().Select("uuid").Where("uuid = ?", cueID).First(&cue).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		response.NotFound(c, "Cue not found")
		return false
	}
	if err != nil {
		response.InternalError(c, "Failed to get cue")
		return false
	}
	return true
}

// TODO: permission control via finding the parent event ID
func deleteAlternateCue(c *gin.Context) {
	alternateID := c.Param("alternateId")
	if alternateID == "" {
		response.BadRequest(c, "Alternate cue ID is required", nil)
		return
	}
	if err := uuid.Validate(alternateID); err != nil {
		response.BadRequest(c, "Invalid alternate cue ID", nil)
		return
	}

	var alternate models.AlternateCue
	err := database.DB().Where("uuid = ?", alternateID).First(&alternate).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		response.NotFound(c, "Alternate cue not found")
		return
	}
	if err != nil {
		response.InternalError(c, "Failed to get alternate cue")
		return
	}

	if err := database.DB().Delete(&alternate).Error; err != nil {
		response.InternalError(c, "Failed to delete alternate cue")
		return
	}

	response.OK(c, map[string]any{"deletedAlternateCue": alternate})
}
