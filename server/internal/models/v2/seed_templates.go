package v2

import (
	"fmt"
	"io/fs"
	"log"
	"sort"

	"gorm.io/gorm"

	"lighting-cue-maker/server/templates"
)

// SeedFixtureTemplates adds the built-in fixture templates (server/templates/*.sql)
// that the library doesn't have yet. Run it after Migrate, on every start.
//
// Each file inserts its template only if no template with the same manufacturer +
// model exists, soft-deleted ones included, so a template removed from the library
// stays removed. An existing template is never updated.
//
// A failing file is logged and skipped; the others still run. The returned error
// lists the failed files.
func SeedFixtureTemplates(db *gorm.DB) error {
	names, err := fs.Glob(templates.FS, "*.sql")
	if err != nil {
		return fmt.Errorf("list template files: %w", err)
	}
	sort.Strings(names) // fixed order, so logs read the same on every start

	var added, failed []string
	for _, name := range names {
		sql, err := fs.ReadFile(templates.FS, name)
		if err != nil {
			log.Printf("fixture templates: read %s: %v", name, err)
			failed = append(failed, name)
			continue
		}
		// One statement per file, so it runs as one transaction on its own.
		res := db.Exec(string(sql))
		if res.Error != nil {
			log.Printf("fixture templates: %s: %v", name, res.Error)
			failed = append(failed, name)
			continue
		}
		if res.RowsAffected > 0 {
			added = append(added, name)
		}
	}

	log.Printf("fixture templates: %d added %v, %d already present, %d failed",
		len(added), added, len(names)-len(added)-len(failed), len(failed))
	if len(failed) > 0 {
		return fmt.Errorf("%d of %d template files failed: %v", len(failed), len(names), failed)
	}
	return nil
}
