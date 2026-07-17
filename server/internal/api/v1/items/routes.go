package items

import "github.com/gin-gonic/gin"

// Register mounts all item routes onto the given router group.

// /api/v1/events/:id/
func Register(rg *gin.RouterGroup) {
	rg.POST("", createItem)
	rg.GET("", getItems)
	rg.POST("/:itemId/cues", createCue)
	rg.PATCH("/:itemId", updateItem)
	// rg.PUT("/:itemId/cues/:cueId", updateCue)
}
