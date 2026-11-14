package timelines

import (
	"lighting-cue-maker/server/internal/api/v2/eventscope"

	"github.com/gin-gonic/gin"
)

// Register mounts the item's main timeline routes onto the router group
// (/api/v2/events/:eventId/items/:itemId/timeline, behind eventscope.Require).
// Alternate timelines get their own routes later.
func Register(rg *gin.RouterGroup) {
	rg.Use(eventscope.RequireItem)
	rg.GET("", getTimeline)
	rg.POST("", upsertTimeline)
}
