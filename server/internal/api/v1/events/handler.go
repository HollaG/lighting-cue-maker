package events

import (
	"fmt"
	"lighting-cue-maker/server/internal/models"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
)

func createEvent(c *gin.Context) {
	var req models.CreateLightEventReq
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Println(err)
		response.BadRequest(c, "Invalid request body",
			map[string]any{
				"request": req,
			})
		return
	}

	// validate fields on backend
	// if req.CuesPerBand <= 0 || req.UniqueCuesPerBand <= 0 {
	// 	// response.BadRequest(c, "Cue count must be positive", {})
	// 	return
	// }
	if req.CuesPerBand < 0 {
		response.BadRequest(c, "Cue count must be positive",
			map[string]any{
				"cuesPerBand": req.CuesPerBand,
			})
		return
	}
	if req.UniqueCuesPerBand < 0 {
		response.BadRequest(c, "Unique cue count must be positive",
			map[string]any{
				"uniqueCuesPerBand": req.UniqueCuesPerBand,
			})
		return
	}

	if req.Name == "" {
		response.BadRequest(c, "Event name cannot be empty",
			map[string]any{
				"name": req.Name,
			})
		return
	}

	// All attributes must have name
	for _, group := range req.FixtureGroups {
		if group.Name == "" {
			response.BadRequest(c, "Fixture group name cannot be empty",
				map[string]any{
					"fixtureGroup": group,
				})
			return
		}
		for _, attribute := range group.Attributes {
			if attribute.Name == "" {
				response.BadRequest(c, "Attribute name cannot be empty",
					map[string]any{
						"attribute": attribute,
					})
				return
			}
		}
	}
	fixtureGroups := []models.FixtureGroupConfiguration{}

	for _, group := range req.FixtureGroups {
		attributes := []models.AttributeConfiguration{}
		for _, attribute := range group.Attributes {
			attributeOption := models.AttributeTypeOptions{
				Select:      attribute.Options.Select,
				Multiselect: attribute.Options.Multiselect,
				Colour:      attribute.Options.Colour,
				Slider:      attribute.Options.Slider,
				Boolean:     attribute.Options.Boolean,
			}

			attribute := models.AttributeConfiguration{
				Name:     attribute.Name,
				Type:     attribute.Type,
				Metadata: attribute.Metadata,
				Options:  attributeOption,
			}
			attributes = append(attributes, attribute)
		}
		group := models.FixtureGroupConfiguration{
			Name:       group.Name,
			Attributes: attributes,
		}
		fixtureGroups = append(fixtureGroups, group)
	}

	bumpConfigurations := []models.BumpConfiguration{}
	// For future use, we can easily change this to store other values.

	for _, bumpReq := range req.BumpConfigurations {
		bumpConfigurations = append(bumpConfigurations, models.BumpConfiguration{
			Name:        bumpReq.Name,
			Description: bumpReq.Description,
		})
	}

	event := models.LightEvent{
		Name:               req.Name,
		CuesPerBand:        req.CuesPerBand,
		UniqueCuesPerBand:  req.UniqueCuesPerBand,
		FixtureGroups:      fixtureGroups,
		BumpConfigurations: bumpConfigurations,
		Description:        req.Description,
		ExternalLink:       req.ExternalLink,
	}

	result := database.DB().Create(&event)

	if result.Error != nil {
		response.InternalError(c, "Failed to create event")
		return
	}

	fmt.Println("API POST /v1/events")

	response.OK(c, map[string]any{
		"event": event,
	})
}

func getEvent(c *gin.Context) {
	eventId := c.Param("eventId")

	if eventId == "" {
		response.BadRequest(c, "Event ID is required", nil)
		return
	}

	var event models.LightEvent
	result := database.DB().
		Preload("FixtureGroups").
		Preload("FixtureGroups.Attributes").
		Preload("BumpConfigurations").
		Where("uuid = ?", eventId).First(&event)
	if result.Error != nil {
		response.NotFound(c, "Event not found")
		return
	}

	response.OK(c, map[string]any{
		"event": event,
	})
}

func updateEvent(c *gin.Context) {
	eventId := c.Param("eventId")

	if eventId == "" {
		response.BadRequest(c, "Event ID is required", nil)
		return
	}

	var event models.LightEvent
	if result := database.DB().Where("uuid = ?", eventId).First(&event); result.Error != nil {
		response.NotFound(c, "Event not found")
		return
	}

	var req models.UpdateLightEventReq
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
			response.BadRequest(c, "Event name cannot be empty", nil)
			return
		}
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.ExternalLink != nil {
		updates["external_link"] = *req.ExternalLink
	}
	if req.CuesPerBand != nil {
		if *req.CuesPerBand < 0 {
			response.BadRequest(c, "Cue count must be positive", nil)
			return
		}
		updates["cues_per_band"] = *req.CuesPerBand
	}
	if req.UniqueCuesPerBand != nil {
		if *req.UniqueCuesPerBand < 0 {
			response.BadRequest(c, "Unique cue count must be positive", nil)
			return
		}
		updates["unique_cues_per_band"] = *req.UniqueCuesPerBand
	}

	if len(updates) > 0 {
		if result := database.DB().Model(&models.LightEvent{}).Where("uuid = ?", eventId).Updates(updates); result.Error != nil {
			response.InternalError(c, "Failed to update event")
			return
		}
	}

	var updatedEvent models.LightEvent
	if result := database.DB().
		Preload("FixtureGroups").
		Preload("FixtureGroups.Attributes").
		Preload("BumpConfigurations").
		Where("uuid = ?", eventId).First(&updatedEvent); result.Error != nil {
		response.InternalError(c, "Failed to fetch updated event")
		return
	}

	fmt.Println("API PATCH /v1/events/:eventId")

	response.OK(c, map[string]any{
		"event": updatedEvent,
	})
}

