package events

import "github.com/gin-gonic/gin"

// Register mounts all event routes onto the given router group.
func Register(rg *gin.RouterGroup) {
	// Example: rg.GET("/events", getEvents)
	rg.POST("", createEvent)
	rg.GET(":id", getEvent)
}
