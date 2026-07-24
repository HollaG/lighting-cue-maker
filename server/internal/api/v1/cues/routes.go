package cues

import "github.com/gin-gonic/gin"

// Register mounts all cue routes onto the given router group (/api/v1/cues).
func Register(rg *gin.RouterGroup) {
	rg.GET("", getCues)
	rg.POST("", createCue)
	rg.PATCH("/:cueId", updateCue)
	rg.DELETE("/:cueId", deleteCue)
}
