package visualiserdata

import "github.com/gin-gonic/gin"

// Register mounts the visualiser data route onto the router group
// (/api/v2/events/:eventId/visualiser-data, behind eventscope.Require).
func Register(rg *gin.RouterGroup) {
	rg.GET("", getVisualiserData)
}
