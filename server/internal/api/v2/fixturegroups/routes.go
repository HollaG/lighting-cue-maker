package fixturegroups

import "github.com/gin-gonic/gin"

// Register mounts fixture group routes onto the router group
// (/api/v2/events/:eventId/fixture-groups, behind eventscope.Require).
func Register(rg *gin.RouterGroup) {
	rg.POST("", upsertFixtureGroups)
	rg.GET("", getFixtureGroups)
	rg.DELETE("/:fixtureGroupId", deleteFixtureGroup)
}
