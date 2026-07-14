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

	event := models.LightEvent{
		Name:              req.Name,
		CuesPerBand:       req.CuesPerBand,
		UniqueCuesPerBand: req.UniqueCuesPerBand,
		FixtureGroups:     fixtureGroups,
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
