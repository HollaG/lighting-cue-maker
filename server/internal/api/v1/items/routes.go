package items

import "github.com/gin-gonic/gin"

// Register mounts all item routes onto the given router group.
func Register(rg *gin.RouterGroup) {
	rg.POST("", createItem)
}
