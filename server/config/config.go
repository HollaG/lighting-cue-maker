package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port    string
	CORSURL string

	WebTransportAddr string
	TLSCertFile      string
	TLSKeyFile       string

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

	return &Config{
		Port:             port,
		CORSURL:          corsURL,
		WebTransportAddr: webTransportAddr,
		TLSCertFile:      tlsCertFile,
		TLSKeyFile:       tlsKeyFile,
		DatabaseURL:      dsn,
	}
}
