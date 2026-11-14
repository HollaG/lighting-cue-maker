package cues

import (
	"lighting-cue-maker/server/internal/api/v2/eventscope"

	"github.com/gin-gonic/gin"
)

// Register mounts cue routes onto the router group
// (/api/v2/events/:eventId/items/:itemId/cues, behind eventscope.Require).
// RequireItem checks the item belongs to the event before any handler runs.
func Register(rg *gin.RouterGroup) {
	rg.Use(eventscope.RequireItem)
	rg.GET("", getCues)
	rg.POST("", upsertCue)
	rg.DELETE("/:cueId", deleteCue)
}
