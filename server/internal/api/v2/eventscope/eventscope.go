// Package eventscope guards every route under /api/v2/events/{eventId}.
package eventscope

import (
	"errors"

	modelsv2 "lighting-cue-maker/server/internal/models/v2"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const eventIdKey = "v2.eventId"

// Require checks that :eventId is an existing (not deleted) event and stores
// its ID for handlers. Auth checks for the event belong here later.
func Require(c *gin.Context) {
	eventId := c.Param("eventId")
	if _, err := uuid.Parse(eventId); err != nil {
		response.BadRequest(c, "Invalid event ID", nil)
		c.Abort()
		return
	}

	err := database.DB().Select("id").Where("id = ?", eventId).First(&modelsv2.Event{}).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		response.NotFound(c, "Event not found")
		c.Abort()
		return
	}
	if err != nil {
		response.InternalError(c, "Failed to get event")
		c.Abort()
		return
	}

	c.Set(eventIdKey, eventId)
	c.Next()
}

// EventId returns the event ID checked by Require. Only call it from handlers
// mounted behind Require.
func EventId(c *gin.Context) string {
	return c.GetString(eventIdKey)
}
