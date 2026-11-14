package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
)

type Config struct {
	Port    string
	CORSURL string

	WebTransportAddr string
	TLSCertFile      string
	TLSKeyFile       string

	// Postgres
	DatabaseURL string

	// Azure Blob Storage for timeline audio. Empty connection string = audio uploads disabled.
	AzureStorageConnectionString string
	AzureAudioContainer          string
	// Upload limits for one audio file.
	AudioMaxBytes      int64
	AudioMaxDurationMs int
}

// envInt reads a positive integer env var, or returns fallback if it's unset or invalid.
func envInt(name string, fallback int64) int64 {
	raw := os.Getenv(name)
	if raw == "" {
		return fallback
	}
	n, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || n <= 0 {
		log.Printf("config: %s=%q is not a positive integer, using %d", name, raw, fallback)
		return fallback
	}
	return n
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

	webTransportAddr := os.Getenv("WEBTRANSPORT_ADDR")
	if webTransportAddr == "" {
		webTransportAddr = ":6121"
	}

	tlsCertFile := os.Getenv("TLS_CERT_FILE")
	if tlsCertFile == "" {
		tlsCertFile = "cert.pem"
	}

	tlsKeyFile := os.Getenv("TLS_KEY_FILE")
	if tlsKeyFile == "" {
		tlsKeyFile = "key.pem"
	}

	audioContainer := os.Getenv("AZURE_AUDIO_CONTAINER")
	if audioContainer == "" {
		audioContainer = "audio"
	}

	return &Config{
		Port:             port,
		CORSURL:          corsURL,
		WebTransportAddr: webTransportAddr,
		TLSCertFile:      tlsCertFile,
		TLSKeyFile:       tlsKeyFile,
		DatabaseURL:      dsn,

		AzureStorageConnectionString: os.Getenv("AZURE_STORAGE_CONNECTION_STRING"),
		AzureAudioContainer:          audioContainer,
		AudioMaxBytes:                envInt("AUDIO_MAX_BYTES", 50*1024*1024),
		AudioMaxDurationMs:           int(envInt("AUDIO_MAX_DURATION_MS", 30*60*1000)),
	}
}
