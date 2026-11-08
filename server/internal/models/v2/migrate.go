package v2

import (
	"fmt"

	"gorm.io/gorm"
)

// All lists every v2 model, for AutoMigrate.
var All = []any{
	&FixtureTemplate{},
	&Event{},
	&PatchedFixture{},
	&FixtureGroup{},
	&OptionSet{},
	&Visualiser{},
	&Item{},
	&Cue{},
	&AlternateCue{},
}

// Migrate creates the "v2" schema and migrates the v2 tables. It is separate
// from the v1 AutoMigrate so v1 stays untouched.
func Migrate(db *gorm.DB) error {
	if err := db.Exec("CREATE SCHEMA IF NOT EXISTS v2").Error; err != nil {
		return fmt.Errorf("create v2 schema: %w", err)
	}
	if err := db.AutoMigrate(All...); err != nil {
		return fmt.Errorf("auto-migrate v2: %w", err)
	}
	return nil
}
