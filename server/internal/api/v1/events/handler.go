package events

import (
	"fmt"
	"lighting-cue-maker/server/internal/models"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
)

func createEvent(c *gin.Context) {
	var req models.CreateLightEventReq
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Println(err)
		response.BadRequest(c, "Invalid request body")
		return
	}

	fmt.Println(req)

	fmt.Println("API POST /v1/events")

	response.OK(c, nil)
}
