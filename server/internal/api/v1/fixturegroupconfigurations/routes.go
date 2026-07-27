package fixturegroupconfigurations

import "github.com/gin-gonic/gin"

// Register mounts fixture group configuration routes onto the router group (/api/v1/fixture-group-config).
func Register(rg *gin.RouterGroup) {
	rg.PATCH("/:fixtureGroupId", updateFixtureGroupConfiguration)
}
