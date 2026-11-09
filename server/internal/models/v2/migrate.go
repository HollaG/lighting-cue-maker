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
	if err := renameUuidColumns(db); err != nil {
		return fmt.Errorf("rename v2 uuid columns: %w", err)
	}
	if err := db.AutoMigrate(All...); err != nil {
		return fmt.Errorf("auto-migrate v2: %w", err)
	}
	return nil
}

// renameUuidColumns renames the old primary key column "uuid" to "id", and
// alternate_cues.cue_uuid to cue_id. AutoMigrate can't infer renames: it would
// add new, empty columns instead. Safe to run more than once.
func renameUuidColumns(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		m := tx.Migrator()
		for _, model := range All {
			if m.HasColumn(model, "uuid") && !m.HasColumn(model, "id") {
				if err := m.RenameColumn(model, "uuid", "id"); err != nil {
					return err
				}
			}
		}
		if m.HasColumn(&AlternateCue{}, "cue_uuid") && !m.HasColumn(&AlternateCue{}, "cue_id") {
			if err := m.RenameColumn(&AlternateCue{}, "cue_uuid", "cue_id"); err != nil {
				return err
			}
			if err := tx.Exec("ALTER INDEX IF EXISTS v2.idx_v2_alternate_cues_cue_uuid RENAME TO idx_v2_alternate_cues_cue_id").Error; err != nil {
				return err
			}
		}
		return nil
	})
}
