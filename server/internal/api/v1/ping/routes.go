package ping

import "github.com/gin-gonic/gin"

// Register mounts all ping routes onto the given router group.
func Register(rg *gin.RouterGroup) {
	rg.GET("/ping", getPing)
}
