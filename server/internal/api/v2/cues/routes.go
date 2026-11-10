package cues

import "github.com/gin-gonic/gin"

// Register mounts cue routes onto the router group
// (/api/v2/events/:eventId/items/:itemId/cues, behind eventscope.Require).
// requireItem checks the item belongs to the event before any handler runs.
func Register(rg *gin.RouterGroup) {
	rg.Use(requireItem)
	rg.GET("", getCues)
	rg.POST("", upsertCue)
	rg.DELETE("/:cueId", deleteCue)
}
