package fixtures

import "github.com/gin-gonic/gin"

// Register mounts fixture routes onto the router group (/api/v1/fixtures).
func Register(rg *gin.RouterGroup) {
	rg.GET("", getFixtures)
	rg.PUT("", upsertFixture)
	rg.DELETE("/:fixtureId", deleteFixture)
}
