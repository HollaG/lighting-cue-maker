package qlc

import "github.com/gin-gonic/gin"

func Register(rg *gin.RouterGroup) {
	rg.POST("/:eventId/generate", getDataForXmlGeneration)
}
