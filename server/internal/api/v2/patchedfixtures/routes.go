package patchedfixtures

import "github.com/gin-gonic/gin"

// Register mounts patched fixture routes onto the router group
// (/api/v2/events/:eventId/patched-fixtures, behind eventscope.Require).
func Register(rg *gin.RouterGroup) {
	rg.POST("", upsertPatchedFixtures)
	rg.GET("", getPatchedFixtures)
}
