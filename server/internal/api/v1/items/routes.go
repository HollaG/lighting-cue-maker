package items

import "github.com/gin-gonic/gin"

// Register mounts all item routes onto the given router group (/api/v1/items).
func Register(rg *gin.RouterGroup) {
	rg.POST("", createItem)
	rg.GET("", getItems)
	rg.GET("/:itemId", getItem)
	rg.PATCH("/:itemId", updateItem)
}
