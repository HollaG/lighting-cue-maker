package main

import (
	"context"
	"log"
	"time"

	"lighting-cue-maker/server/config"
	"lighting-cue-maker/server/internal/models"
	modelsv2 "lighting-cue-maker/server/internal/models/v2"
	"lighting-cue-maker/server/internal/realtime"
	"lighting-cue-maker/server/internal/router"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/storage"

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

	// AutoMigrate creates new columns but does not infer column renames.
	if migrator := database.DB().Migrator(); migrator.HasColumn(&models.Fixture{}, "fixture_group_uuid") &&
		!migrator.HasColumn(&models.Fixture{}, "fixture_group_configuration_uuid") {
		if err := migrator.RenameColumn(&models.Fixture{}, "fixture_group_uuid", "fixture_group_configuration_uuid"); err != nil {
			log.Fatalf("database: failed to rename fixture group column: %v", err)
		}
	}

	if err := database.DB().AutoMigrate(
		&models.LightEvent{},
		&models.FixtureGroupConfiguration{},
		&models.AttributeConfiguration{},
		&models.Item{},
		&models.Cue{},
		&models.AlternateCue{},
		&models.BumpConfiguration{},
		&models.Bump{},
		&models.Fixture{},
		&models.Visualiser{},
	); err != nil {
		log.Fatalf("database: AutoMigrate failed: %v", err)
	}

	if err := modelsv2.Migrate(database.DB()); err != nil {
		log.Fatalf("database: v2 migration failed: %v", err)
	}

	// Built-in fixture library: adds the templates that are missing. Not fatal on purpose:
	// an incomplete library shouldn't stop the server (and v1) from starting.
	if err := modelsv2.SeedFixtureTemplates(database.DB()); err != nil {
		log.Printf("database: seeding fixture templates: %v", err)
	}

	audioStore := connectAudioStorage(cfg)

	r := gin.Default()
	router.Setup(r, cfg, audioStore)

	// WebTransport server
	realtimeServer := realtime.NewServer(
		cfg.WebTransportAddr,
		cfg.TLSCertFile,
		cfg.TLSKeyFile,
		cfg.CORSURL,
	)

	go func() {
		log.Printf("WebTransport server starting on %s", cfg.WebTransportAddr)
		if err := realtimeServer.ListenAndServe(); err != nil {
			log.Fatalf("WebTransport server failed: %v", err)
		}
	}()

	defer realtimeServer.Close()

	log.Printf("Server starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// connectAudioStorage connects to Azure Blob Storage (Azurite in dev) for timeline audio.
// Not fatal: without it the server still runs, and the audio endpoints answer 503.
func connectAudioStorage(cfg *config.Config) *storage.Store {
	if cfg.AzureStorageConnectionString == "" {
		log.Println("storage: AZURE_STORAGE_CONNECTION_STRING not set, audio uploads disabled")
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	store, err := storage.New(ctx, cfg.AzureStorageConnectionString, cfg.AzureAudioContainer)
	if err != nil {
		log.Printf("storage: %v (audio uploads disabled; in dev, is Azurite running?)", err)
		return nil
	}
	log.Printf("storage: connected, container %q", cfg.AzureAudioContainer)
	return store
}
