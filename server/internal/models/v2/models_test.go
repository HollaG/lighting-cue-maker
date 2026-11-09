package v2

import (
	"strings"
	"sync"
	"testing"

	"gorm.io/gorm/schema"
)

func TestAllTablesAreInV2Schema(t *testing.T) {
	for _, m := range All {
		s, err := schema.Parse(m, &sync.Map{}, schema.NamingStrategy{})
		if err != nil {
			t.Fatalf("parse %T: %v", m, err)
		}
		if !strings.HasPrefix(s.Table, "v2.") {
			t.Errorf("%T: table %q is not in the v2 schema", m, s.Table)
		}
		for _, col := range []string{"id", "created_at", "updated_at", "deleted_at"} {
			if s.LookUpField(col) == nil {
				t.Errorf("%T: missing base column %q", m, col)
			}
		}
	}
}

func TestCueSelectableIdsHasGinIndex(t *testing.T) {
	for _, m := range []any{&Cue{}, &AlternateCue{}} {
		s, err := schema.Parse(m, &sync.Map{}, schema.NamingStrategy{})
		if err != nil {
			t.Fatalf("parse %T: %v", m, err)
		}
		found := false
		for _, idx := range s.ParseIndexes() {
			if len(idx.Fields) == 1 && idx.Fields[0].DBName == "selectable_ids" {
				found = true
				if idx.Type != "gin" {
					t.Errorf("%T: selectable_ids index type = %q, want gin", m, idx.Type)
				}
				if strings.Contains(idx.Name, ".") {
					t.Errorf("%T: index name %q contains a dot", m, idx.Name)
				}
			}
		}
		if !found {
			t.Errorf("%T: no index on selectable_ids", m)
		}
	}
}
