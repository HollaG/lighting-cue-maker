package events

import (
	"errors"
	"fmt"
	"lighting-cue-maker/server/internal/models"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var errEventNotFound = errors.New("event not found")

// updateEventRequestError represents a request problem discovered while the
// transaction is reconciling nested fixture groups and attributes.
type updateEventRequestError struct {
	message string
}

func (e *updateEventRequestError) Error() string {
	return e.message
}

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

// Update an existing event.
// Any fixture group or attribute without an ID is created.
// Any fixture group or attribute with an ID is updated.
// TODO: add authentication
func updateEvent(c *gin.Context) {
	eventId := c.Param("eventId")

	if eventId == "" {
		response.BadRequest(c, "Event ID is required", nil)
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

	var updatedEvent models.LightEvent

	// The whole edit is atomic: a failure in any nested operation rolls back
	// the event fields, fixture groups, attributes, and deletions together.
	err := database.DB().Transaction(func(tx *gorm.DB) error {
		var event models.LightEvent
		result := tx.Where("uuid = ?", eventId).First(&event)
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return errEventNotFound // event wrong
		}
		if result.Error != nil {
			return result.Error
		}

		if err := updateEventFields(tx, eventId, req); err != nil {
			return err
		}

		if err := validateNestedEventChanges(req); err != nil {
			return err
		}

		// Delete individual attributes before groups. A group deletion also
		// soft-deletes all of its remaining attributes.
		if err := deleteEventAttributes(tx, eventId, req.DeletedAttributeIDs); err != nil {
			return err
		}
		if err := deleteEventFixtureGroups(tx, eventId, req.DeletedFixtureGroupIDs); err != nil {
			return err
		}

		if req.FixtureGroups != nil {
			if err := upsertEventFixtureGroups(tx, eventId, *req.FixtureGroups); err != nil {
				return err
			}
		}

		// Return the server's canonical version, including generated UUIDs.
		return tx.
			Preload("FixtureGroups", func(db *gorm.DB) *gorm.DB {
				return db.Order("fixture_group_configurations.\"order\" ASC")
			}).
			Preload("FixtureGroups.Attributes", func(db *gorm.DB) *gorm.DB {
				return db.Order("attribute_configurations.\"order\" ASC")
			}).
			Preload("BumpConfigurations").
			Where("uuid = ?", eventId).
			First(&updatedEvent).
			Error
	})

	if errors.Is(err, errEventNotFound) {
		response.NotFound(c, "Event not found")
		return
	}

	var requestErr *updateEventRequestError
	if errors.As(err, &requestErr) {
		response.BadRequest(c, requestErr.message, nil)
		return
	}

	if err != nil {
		fmt.Println(err)
		response.InternalError(c, "Failed to update event")
		return
	}

	fmt.Println("API PATCH /v1/events/:eventId")

	response.OK(c, map[string]any{
		"event": updatedEvent,
	})
}

// Update the direct fields of the event
func updateEventFields(tx *gorm.DB, eventId string, req models.UpdateLightEventReq) error {
	updates := map[string]any{}

	if req.Name != nil {
		if *req.Name == "" {
			return &updateEventRequestError{message: "Event name cannot be empty"}
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
			return &updateEventRequestError{message: "Cue count must be positive"}
		}
		updates["cues_per_band"] = *req.CuesPerBand
	}
	if req.UniqueCuesPerBand != nil {
		if *req.UniqueCuesPerBand < 0 {
			return &updateEventRequestError{message: "Unique cue count must be positive"}
		}
		updates["unique_cues_per_band"] = *req.UniqueCuesPerBand
	}

	if len(updates) == 0 {
		return nil
	}

	return tx.
		Model(&models.LightEvent{}).
		Where("uuid = ?", eventId).
		Updates(updates).
		Error
}

// validateNestedEventChanges rejects ambiguous requests before any nested
// records are changed. The surrounding transaction still protects event fields.
func validateNestedEventChanges(req models.UpdateLightEventReq) error {
	deletedGroupIDs := make(map[string]struct{}, len(req.DeletedFixtureGroupIDs))
	for _, id := range req.DeletedFixtureGroupIDs {
		if id == "" {
			return &updateEventRequestError{message: "Deleted fixture group ID cannot be empty"}
		}
		if _, duplicate := deletedGroupIDs[id]; duplicate {
			return &updateEventRequestError{message: fmt.Sprintf("Fixture group %q is deleted more than once", id)}
		}
		deletedGroupIDs[id] = struct{}{}
	}

	deletedAttributeIDs := make(map[string]struct{}, len(req.DeletedAttributeIDs))
	for _, id := range req.DeletedAttributeIDs {
		if id == "" {
			return &updateEventRequestError{message: "Deleted attribute ID cannot be empty"}
		}
		if _, duplicate := deletedAttributeIDs[id]; duplicate {
			return &updateEventRequestError{message: fmt.Sprintf("Attribute %q is deleted more than once", id)}
		}
		deletedAttributeIDs[id] = struct{}{}
	}

	if req.FixtureGroups == nil {
		return nil
	}

	seenGroupIDs := map[string]struct{}{}
	seenAttributeIDs := map[string]struct{}{}

	for _, group := range *req.FixtureGroups {
		if group.Name == "" {
			return &updateEventRequestError{message: "Fixture group name cannot be empty"}
		}

		if group.ID != nil {
			if *group.ID == "" {
				return &updateEventRequestError{message: "Fixture group ID cannot be empty"}
			}
			if _, deleting := deletedGroupIDs[*group.ID]; deleting {
				return &updateEventRequestError{message: fmt.Sprintf("Fixture group %q cannot be updated and deleted together", *group.ID)}
			}
			if _, duplicate := seenGroupIDs[*group.ID]; duplicate {
				return &updateEventRequestError{message: fmt.Sprintf("Fixture group %q appears more than once", *group.ID)}
			}
			seenGroupIDs[*group.ID] = struct{}{}
		}

		for _, attribute := range group.Attributes {
			if attribute.Name == "" {
				return &updateEventRequestError{message: "Attribute name cannot be empty"}
			}
			if attribute.ID == nil {
				continue
			}
			if *attribute.ID == "" {
				return &updateEventRequestError{message: "Attribute ID cannot be empty"}
			}
			if _, deleting := deletedAttributeIDs[*attribute.ID]; deleting {
				return &updateEventRequestError{message: fmt.Sprintf("Attribute %q cannot be updated and deleted together", *attribute.ID)}
			}
			if _, duplicate := seenAttributeIDs[*attribute.ID]; duplicate {
				return &updateEventRequestError{message: fmt.Sprintf("Attribute %q appears more than once", *attribute.ID)}
			}
			seenAttributeIDs[*attribute.ID] = struct{}{}
		}
	}

	return nil
}

func upsertEventFixtureGroups(
	tx *gorm.DB,
	eventId string,
	requests []models.UpsertFixtureGroupConfigurationReq,
) error {
	for _, groupReq := range requests {
		var group models.FixtureGroupConfiguration

		if groupReq.ID == nil {
			// With no UUID supplied, Create lets PostgreSQL generate one.
			group = models.FixtureGroupConfiguration{
				LightEventUuid: eventId,
				Name:           groupReq.Name,
				Order:          groupReq.Order,
			}
			if err := tx.Create(&group).Error; err != nil {
				return err
			}
		} else {
			result := tx.
				Where("uuid = ? AND light_event_uuid = ?", *groupReq.ID, eventId).
				First(&group)
			if errors.Is(result.Error, gorm.ErrRecordNotFound) {
				return &updateEventRequestError{message: fmt.Sprintf("Fixture group %q does not belong to this event", *groupReq.ID)}
			}
			if result.Error != nil {
				return result.Error
			}

			// Select includes zero values such as order 0 in the update.
			if err := tx.Model(&group).
				Select("Name", "Order").
				Updates(&models.FixtureGroupConfiguration{
					Name:  groupReq.Name,
					Order: groupReq.Order,
				}).Error; err != nil {
				return err
			}
		}

		if err := upsertFixtureGroupAttributes(tx, group.Uuid, groupReq.Attributes); err != nil {
			return err
		}
	}

	return nil
}

func upsertFixtureGroupAttributes(
	tx *gorm.DB,
	fixtureGroupId string,
	requests []models.UpsertAttributeConfigurationReq,
) error {
	for _, attributeReq := range requests {
		if attributeReq.ID == nil {
			attribute := models.AttributeConfiguration{
				FixtureGroupConfigurationUuid: fixtureGroupId,
				Name:                          attributeReq.Name,
				Type:                          attributeReq.Type,
				Metadata:                      attributeReq.Metadata,
				Options:                       attributeReq.Options,
				Order:                         attributeReq.Order,
			}
			if err := tx.Create(&attribute).Error; err != nil {
				return err
			}
			continue
		}

		var attribute models.AttributeConfiguration
		result := tx.
			Where(
				"uuid = ? AND fixture_group_configuration_uuid = ?",
				*attributeReq.ID,
				fixtureGroupId,
			).
			First(&attribute)
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return &updateEventRequestError{message: fmt.Sprintf("Attribute %q does not belong to fixture group %q", *attributeReq.ID, fixtureGroupId)}
		}
		if result.Error != nil {
			return result.Error
		}

		if err := tx.Model(&attribute).
			Select("Name", "Type", "Metadata", "Options", "Order").
			Updates(&models.AttributeConfiguration{
				Name:     attributeReq.Name,
				Type:     attributeReq.Type,
				Metadata: attributeReq.Metadata,
				Options:  attributeReq.Options,
				Order:    attributeReq.Order,
			}).Error; err != nil {
			return err
		}
	}

	return nil
}

func deleteEventAttributes(tx *gorm.DB, eventId string, attributeIDs []string) error {
	for _, attributeId := range attributeIDs {
		var attribute models.AttributeConfiguration

		// Join through the parent group so an event cannot delete another
		// event's attribute merely by knowing its UUID.
		result := tx.
			Joins(`
				JOIN fixture_group_configurations fixture_group
					ON fixture_group.uuid = attribute_configurations.fixture_group_configuration_uuid
					AND fixture_group.deleted_at IS NULL
			`).
			Where("attribute_configurations.uuid = ? AND fixture_group.light_event_uuid = ?", attributeId, eventId).
			First(&attribute)
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return &updateEventRequestError{message: fmt.Sprintf("Attribute %q does not belong to this event", attributeId)}
		}
		if result.Error != nil {
			return result.Error
		}

		if err := tx.Delete(&attribute).Error; err != nil {
			return err
		}
	}

	return nil
}

func deleteEventFixtureGroups(tx *gorm.DB, eventId string, fixtureGroupIDs []string) error {
	for _, fixtureGroupId := range fixtureGroupIDs {
		var group models.FixtureGroupConfiguration

		result := tx.
			Where("uuid = ? AND light_event_uuid = ?", fixtureGroupId, eventId).
			First(&group)
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return &updateEventRequestError{message: fmt.Sprintf("Fixture group %q does not belong to this event", fixtureGroupId)}
		}
		if result.Error != nil {
			return result.Error
		}

		// These models use soft deletion, so a database FK cascade would not
		// soft-delete the group's attributes for us.
		if err := tx.
			Where("fixture_group_configuration_uuid = ?", group.Uuid).
			Delete(&models.AttributeConfiguration{}).
			Error; err != nil {
			return err
		}

		if err := tx.Delete(&group).Error; err != nil {
			return err
		}
	}

	return nil
}
