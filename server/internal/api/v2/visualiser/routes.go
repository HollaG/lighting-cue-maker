package visualiser

import "github.com/gin-gonic/gin"

// Register mounts visualiser routes onto the router group
// (/api/v2/events/:eventId/visualiser, behind eventscope.Require).
func Register(rg *gin.RouterGroup) {
	rg.POST("", upsertVisualiser)
	rg.GET("", getVisualiser)
}
