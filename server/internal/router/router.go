package router

import (
	"time"

	"lighting-cue-maker/server/config"
	"lighting-cue-maker/server/internal/api/v1/events"
	"lighting-cue-maker/server/internal/api/v1/ping"
	"lighting-cue-maker/server/internal/api/v1/qlc"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Setup(r *gin.Engine, cfg *config.Config) {
	// CORS middleware — origin read from CORS_URL env var
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.CORSURL},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Health check at root (outside versioning)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API v1
	v1 := r.Group("/api/v1")
	{
		ping.Register(v1)

		// /events (and nested /events/:id/items)
		events.Register(v1.Group("/events"))
		qlc.Register(v1.Group("/qlc"))

		// Add future entity route groups here:
		// fixtures.Register(v1)
		// cues.Register(v1)
	}
}
