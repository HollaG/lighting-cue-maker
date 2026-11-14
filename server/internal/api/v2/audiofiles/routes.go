package audiofiles

import (
	"lighting-cue-maker/server/internal/api/v2/eventscope"
	"lighting-cue-maker/server/pkg/storage"

	"github.com/gin-gonic/gin"
)

// Limits for one uploaded file.
type Limits struct {
	MaxBytes      int64
	MaxDurationMs int
}

// Register mounts the item's audio file routes onto the router group
// (/api/v2/events/:eventId/items/:itemId/audio-files, behind eventscope.Require).
// store may be nil (storage not configured): the routes then answer 503.
func Register(rg *gin.RouterGroup, store *storage.Store, limits Limits) {
	h := &handler{store: store, limits: limits}
	rg.Use(eventscope.RequireItem)
	rg.GET("", h.list)
	rg.POST("", h.upload)
}
