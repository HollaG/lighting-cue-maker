package ai

import "github.com/gin-gonic/gin"

// Register mounts alternate cue routes under /api/v1/alternate-cues.
func Register(rg *gin.RouterGroup) {
	// rg.GET("", getAlternateCues)
	rg.POST("generate-cue", generateCue)
	// rg.PUT("/:alternateId", upsertAlternateCue)
	// rg.DELETE("/:alternateId", deleteAlternateCue)
}
