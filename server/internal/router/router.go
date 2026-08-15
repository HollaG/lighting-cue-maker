package router

import (
	"time"

	"lighting-cue-maker/server/config"
	"lighting-cue-maker/server/internal/api/v1/attributeconfigurations"
	"lighting-cue-maker/server/internal/api/v1/bumpconfigurations"
	"lighting-cue-maker/server/internal/api/v1/bumps"
	"lighting-cue-maker/server/internal/api/v1/cues"
	"lighting-cue-maker/server/internal/api/v1/events"
	"lighting-cue-maker/server/internal/api/v1/fixturegroupconfigurations"
	"lighting-cue-maker/server/internal/api/v1/fixtures"
	"lighting-cue-maker/server/internal/api/v1/items"
	"lighting-cue-maker/server/internal/api/v1/ping"
	"lighting-cue-maker/server/internal/api/v1/qlc"
	"lighting-cue-maker/server/internal/api/v1/visualiser"

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

		events.Register(v1.Group("/events"))
		fixtures.Register(v1.Group("/fixtures"))
		items.Register(v1.Group("/items"))
		cues.Register(v1.Group("/cues"))
		bumpconfigurations.Register(v1.Group("/bump-configurations"))
		bumps.Register(v1.Group("/bumps"))
		fixturegroupconfigurations.Register(v1.Group("/fixture-group-config"))
		attributeconfigurations.Register(v1.Group("/attribute-config"))
		qlc.Register(v1.Group("/qlc"))
		visualiser.Register(v1.Group("/visualiser"))
	}
}
