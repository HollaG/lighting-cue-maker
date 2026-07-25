package bumpconfigurations

import "github.com/gin-gonic/gin"

// Register mounts all bump configuration routes onto the given router group (/api/v1/bump-configurations).
func Register(rg *gin.RouterGroup) {
	rg.POST("", createBumpConfiguration)
	rg.GET("", getBumpConfigurations)
	rg.PATCH("/:bumpConfigurationId", updateBumpConfiguration)
	rg.DELETE("/:bumpConfigurationId", deleteBumpConfiguration)
}
