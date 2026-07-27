package events

import (
	"github.com/gin-gonic/gin"
)

// Register mounts all event routes onto the given router group.
func Register(rg *gin.RouterGroup) {
	rg.POST("", createEvent)
	rg.GET("/:eventId", getEvent)
	rg.PATCH("/:eventId", updateEvent)
}
