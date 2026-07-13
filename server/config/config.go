package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port    string
	CORSURL string

	// Postgres — populated later
	DatabaseURL string
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	corsURL := os.Getenv("CORS_URL")
	if corsURL == "" {
		corsURL = "http://localhost:5173"
	}

	fmt.Println("Loaded config CORS URL of " + corsURL)

	return &Config{
		Port:        port,
		CORSURL:     corsURL,
		DatabaseURL: os.Getenv("DATABASE_URL"),
	}
}
