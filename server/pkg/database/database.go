package database

import (
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var db *gorm.DB

// Connect opens the Postgres connection using the provided DSN and stores it
// as a package-level singleton. Call this once at startup (e.g. in main).
func Connect(dsn string) {
	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("database: failed to connect: %v", err)
	}

	log.Println("database: connection established")
}

// DB returns the singleton *gorm.DB instance.
// Panics if Connect has not been called yet.
func DB() *gorm.DB {
	if db == nil {
		panic("database: DB() called before Connect()")
	}
	return db
}
