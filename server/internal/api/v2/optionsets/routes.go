package optionsets

import "github.com/gin-gonic/gin"

// Register mounts option set routes onto the router group
// (/api/v2/events/:eventId/fixture-groups/:fixtureGroupId/option-sets,
// behind eventscope.Require). requireFixtureGroup checks the group belongs to
// the event before any handler runs.
func Register(rg *gin.RouterGroup) {
	rg.Use(requireFixtureGroup)
	rg.GET("", getOptionSets)
	rg.POST("", upsertOptionSets)
	rg.GET("/:optionSetId", getOptionSet)
	rg.DELETE("/:optionSetId", deleteOptionSet)
}
