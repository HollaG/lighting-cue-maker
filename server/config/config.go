package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port    string
	CORSURL string

	// Postgres
	DatabaseURL string
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8099"
	}

	corsURL := os.Getenv("CORS_URL")
	if corsURL == "" {
		corsURL = "http://localhost:5173"
	}

	pgHost := os.Getenv("POSTGRES_HOST")
	if pgHost == "" {
		pgHost = "localhost"
	}
	pgPort := os.Getenv("POSTGRES_PORT")
	if pgPort == "" {
		pgPort = "5432"
	}

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		pgHost,
		pgPort,
		os.Getenv("POSTGRES_USER"),
		os.Getenv("POSTGRES_PASSWORD"),
		os.Getenv("POSTGRES_DB"),
	)

	return &Config{
		Port:        port,
		CORSURL:     corsURL,
		DatabaseURL: dsn,
	}
}
