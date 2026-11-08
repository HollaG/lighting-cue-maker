package fixturetemplates

import "github.com/gin-gonic/gin"

// Register mounts fixture library routes onto the router group (/api/v2/fixture-templates).
func Register(rg *gin.RouterGroup) {
	rg.GET("", getFixtureTemplates)
}
