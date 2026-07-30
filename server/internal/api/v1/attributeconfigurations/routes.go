package attributeconfigurations

import "github.com/gin-gonic/gin"

// Register mounts attribute configuration routes onto the router group (/api/v1/attribute-config).
func Register(rg *gin.RouterGroup) {
	rg.POST("", createAttributeConfiguration)
	rg.PATCH("/:attributeId", updateAttributeConfiguration)
}
