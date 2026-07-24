package bumps

import "github.com/gin-gonic/gin"

// Register mounts all bump configuration routes onto the given router group (/api/v1/bumps).
func Register(rg *gin.RouterGroup) {
	rg.POST("", createBump)
	rg.GET("", getBumps)
	rg.DELETE("/:bumpId", deleteBump)
}
