package events

import (
	"lighting-cue-maker/server/internal/api/v1/items"

	"github.com/gin-gonic/gin"
)

// Register mounts all event routes onto the given router group.
func Register(rg *gin.RouterGroup) {
	// Example: rg.GET("/events", getEvents)
	rg.POST("", createEvent)
	rg.GET(":id", getEvent)

	items.Register(rg.Group("/:id/items"))
}
