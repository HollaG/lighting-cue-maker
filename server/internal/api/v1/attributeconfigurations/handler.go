package attributeconfigurations

import (
	"encoding/json"
	"fmt"
	"lighting-cue-maker/server/internal/models"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
)

func updateAttributeConfiguration(c *gin.Context) {
	attributeId := c.Param("attributeId")
	if attributeId == "" {
		response.BadRequest(c, "Attribute ID is required", nil)
		return
	}

	var attr models.AttributeConfiguration
	if result := database.DB().Where("uuid = ?", attributeId).First(&attr); result.Error != nil {
		response.NotFound(c, "Attribute configuration not found")
		return
	}

	var req models.UpdateAttributeConfigurationReq
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Println(err)
		response.BadRequest(c, "Invalid request body", map[string]any{
			"request": req,
		})
		return
	}

	// Apply updates directly on the loaded struct so GORM's
	// serializer:json tags handle Metadata and Options correctly.
	changed := false
	if req.Name != nil {
		if *req.Name == "" {
			response.BadRequest(c, "Attribute name cannot be empty", nil)
			return
		}
		attr.Name = *req.Name
		changed = true
	}
	if req.Type != nil {
		attr.Type = *req.Type
		changed = true
	}
	if req.Metadata != nil {
		attr.Metadata = *req.Metadata
		changed = true
	}
	if req.Options != nil {
		attributeOption := models.AttributeTypeOptions{
			Select:      req.Options.Select,
			Multiselect: req.Options.Multiselect,
			Colour:      req.Options.Colour,
			Slider:      req.Options.Slider,
			Boolean:     req.Options.Boolean,
		}
		attr.Options = attributeOption
		changed = true
	}

	if changed {
		// Manually serialize Metadata and Options to JSON bytes so
		// GORM can store them in the text/jsonb column correctly.
		metadataBytes, err := json.Marshal(attr.Metadata)
		if err != nil {
			response.InternalError(c, "Failed to serialize metadata")
			return
		}
		optionsBytes, err := json.Marshal(attr.Options)
		if err != nil {
			response.InternalError(c, "Failed to serialize options")
			return
		}

		updates := map[string]any{
			"name":     attr.Name,
			"type":     string(attr.Type),
			"metadata": string(metadataBytes),
			"options":  string(optionsBytes),
		}

		if result := database.DB().Model(&models.AttributeConfiguration{}).Where("uuid = ?", attributeId).Updates(updates); result.Error != nil {
			response.InternalError(c, "Failed to update attribute configuration")
			return
		}
	}

	var updatedAttr models.AttributeConfiguration
	if result := database.DB().Where("uuid = ?", attributeId).First(&updatedAttr); result.Error != nil {
		response.InternalError(c, "Failed to fetch updated attribute configuration")
		return
	}

	fmt.Println("API PATCH /v1/attribute-config/:attributeId")

	response.OK(c, map[string]any{
		"attribute": updatedAttr,
	})
}
