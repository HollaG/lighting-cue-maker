package main

import (
	"log"

	"lighting-cue-maker/server/config"
	"lighting-cue-maker/server/internal/models"
	"lighting-cue-maker/server/internal/router"
	"lighting-cue-maker/server/pkg/database"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		// panic("No .env found! Please check if it is present.")
		log.Println("No .env file found, falling back to system environment variables")
	}

	cfg := config.Load()

	database.Connect(cfg.DatabaseURL)

	if err := database.DB().AutoMigrate(
		&models.LightEvent{},
		&models.FixtureGroupConfiguration{},
		&models.AttributeConfiguration{},
		&models.Item{},
		&models.Cue{},
	); err != nil {
		log.Fatalf("database: AutoMigrate failed: %v", err)
	}

	r := gin.Default()
	router.Setup(r, cfg)

	log.Printf("Server starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
