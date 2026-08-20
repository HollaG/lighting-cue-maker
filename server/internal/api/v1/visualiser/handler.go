package visualiser

import (
	"encoding/json"
	"errors"
	"fmt"
	"lighting-cue-maker/server/internal/models"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

func getOrCreateVisualiser(c *gin.Context) {
	eventID := c.Param("eventId")
	if eventID == "" {
		response.BadRequest(c, "Event ID is required", nil)
		return
	}

	if err := ensureEventExists(eventID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.NotFound(c, "Event not found")
			return
		}
		response.InternalError(c, "Failed to get event")
		return
	}

	var savedVisualiser models.Visualiser
	result := database.DB().
		Where("light_event_uuid = ?", eventID).
		Attrs(defaultVisualiser(eventID)).
		FirstOrCreate(&savedVisualiser)
	if result.Error != nil {
		response.InternalError(c, "Failed to get or create visualiser")
		return
	}

	fmt.Println("API PUT /v1/visualiser/" + eventID)
	if result.RowsAffected == 1 {
		response.Created(c, map[string]any{
			"visualiser": savedVisualiser,
		})
		return
	}

	response.OK(c, map[string]any{
		"visualiser": savedVisualiser,
	})
}

func upsertVisualiser(c *gin.Context) {
	var req models.UpsertVisualiserReq
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Println(err)
		response.BadRequest(c, "Invalid request body", map[string]any{
			"request": req,
		})
		return
	}

	if req.EventID == "" {
		response.BadRequest(c, "Event ID is required", nil)
		return
	}
	if len(req.Objects2D) > 0 && !isJSONArray(req.Objects2D) {
		response.BadRequest(c, "Objects2D must be a JSON array", nil)
		return
	}
	if len(req.FixtureAttributeMapping) > 0 && !isJSONObject(req.FixtureAttributeMapping) {
		response.BadRequest(c, "Fixture attribute mapping must be a JSON object", nil)
		return
	}

	if err := ensureEventExists(req.EventID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.NotFound(c, "Event not found")
			return
		}
		response.InternalError(c, "Failed to get event")
		return
	}

	var savedVisualiser models.Visualiser
	query := database.DB().Where("light_event_uuid = ?", req.EventID)
	if req.ID != "" {
		query = query.Where("uuid = ?", req.ID)
	}
	result := query.First(&savedVisualiser)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		if req.ID != "" {
			response.NotFound(c, "Visualiser not found for event")
			return
		}

		savedVisualiser = visualiserFromRequest(req)
		createQuery := database.DB()
		if len(req.Objects2D) == 0 {
			createQuery = createQuery.Omit("Objects2D")
		}
		if result := createQuery.Create(&savedVisualiser); result.Error != nil {
			response.InternalError(c, "Failed to create visualiser")
			return
		}

		fmt.Println("API PUT /v1/visualiser")
		response.Created(c, map[string]any{
			"visualiser": savedVisualiser,
		})
		return
	}
	if result.Error != nil {
		response.InternalError(c, "Failed to get visualiser")
		return
	}

	if req.DefaultViewport != nil {
		savedVisualiser.DefaultViewport = req.DefaultViewport
	}
	updateFields := []string{"DefaultViewport"}
	if len(req.Objects2D) > 0 {
		savedVisualiser.Objects2D = req.Objects2D
		updateFields = append(updateFields, "Objects2D")
	}
	if len(req.FixtureAttributeMapping) > 0 {
		savedVisualiser.FixtureAttributeMapping = req.FixtureAttributeMapping
		updateFields = append(updateFields, "FixtureAttributeMapping")
	}
	if result := database.DB().Select(updateFields).Updates(&savedVisualiser); result.Error != nil {
		response.InternalError(c, "Failed to update visualiser")
		return
	}

	fmt.Println("API PUT /v1/visualiser")
	response.OK(c, map[string]any{
		"visualiser": savedVisualiser,
	})
}

func ensureEventExists(eventID string) error {
	return database.DB().
		Select("uuid").
		Where("uuid = ?", eventID).
		First(&models.LightEvent{}).
		Error
}

func isJSONArray(value datatypes.JSON) bool {
	var items []json.RawMessage
	return json.Unmarshal(value, &items) == nil && items != nil
}

func isJSONObject(value datatypes.JSON) bool {
	var object map[string]json.RawMessage
	return json.Unmarshal(value, &object) == nil && object != nil
}

func visualiserFromRequest(req models.UpsertVisualiserReq) models.Visualiser {
	return models.Visualiser{
		LightEventUuid:          req.EventID,
		DefaultViewport:         req.DefaultViewport,
		Objects2D:               req.Objects2D,
		FixtureAttributeMapping: req.FixtureAttributeMapping,
	}
}

func defaultVisualiser(eventID string) models.Visualiser {
	return models.Visualiser{
		LightEventUuid: eventID,

		// Users MUST create a default viewport.
		DefaultViewport:         nil,
		Objects2D:               datatypes.JSON(`[]`),
		FixtureAttributeMapping: datatypes.JSON(`{}`),
	}
}
