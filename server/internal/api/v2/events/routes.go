package events

import "github.com/gin-gonic/gin"

// Register mounts event routes onto the router group (/api/v2/events).
func Register(rg *gin.RouterGroup) {
	rg.POST("", createEvent)
}

// RegisterScoped mounts routes for one event onto the group
// /api/v2/events/:eventId, which runs eventscope.Require first.
func RegisterScoped(rg *gin.RouterGroup) {
	rg.GET("", getEvent)
	rg.PATCH("", updateEvent)
}
