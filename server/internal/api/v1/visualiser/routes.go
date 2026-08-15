package visualiser

import "github.com/gin-gonic/gin"

// Register mounts visualiser routes onto the router group (/api/v1/visualiser).
func Register(rg *gin.RouterGroup) {
	rg.PUT("", upsertVisualiser)
	rg.PUT("/:eventId", getOrCreateVisualiser)
}
