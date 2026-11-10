package items

import "github.com/gin-gonic/gin"

// Register mounts item routes onto the router group
// (/api/v2/events/:eventId/items, behind eventscope.Require).
func Register(rg *gin.RouterGroup) {
	rg.GET("", getItems)
	rg.POST("", upsertItem)
	rg.GET("/:itemId", getItem)
	rg.DELETE("/:itemId", deleteItem)
}
