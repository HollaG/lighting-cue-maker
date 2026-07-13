package ping

import (
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
)

func getPing(c *gin.Context) {
	response.OK(c, gin.H{"pong": true})
}
