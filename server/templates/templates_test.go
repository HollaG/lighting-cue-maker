package templates

import (
	"io/fs"
	"strings"
	"testing"
)

// The server runs every file on every start, so a plain INSERT would add a duplicate each time.
func TestEveryTemplateFileInsertsOnlyWhenMissing(t *testing.T) {
	names, err := fs.Glob(FS, "*.sql")
	if err != nil {
		t.Fatal(err)
	}
	if len(names) == 0 {
		t.Fatal("no template files embedded")
	}
	for _, name := range names {
		sql, err := fs.ReadFile(FS, name)
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(string(sql), "WHERE NOT EXISTS") {
			t.Errorf("%s: must use INSERT ... SELECT ... WHERE NOT EXISTS (manufacturer + model), not a plain INSERT", name)
		}
	}
}
