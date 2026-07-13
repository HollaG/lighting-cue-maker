package main

import (
	"log"

	"lighting-cue-maker/server/config"
	"lighting-cue-maker/server/internal/router"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	r := gin.Default()
	router.Setup(r, cfg)

	log.Printf("Server starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
