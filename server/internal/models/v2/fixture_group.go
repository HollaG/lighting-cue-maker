package v2

import "gorm.io/datatypes"

// Request DTOs. Keep these in sync with website/src/types-v2/fixtureGroups.ts
// and website/src/query-v2/fixture-groups.

// UpsertFixtureGroupReq: no id = create, id = update. A field left out keeps
// its current value (on create: its default). The event comes from the URL.
type UpsertFixtureGroupReq struct {
	Id          *string  `json:"id,omitempty"`
	Name        *string  `json:"name,omitempty"`
	Description *string  `json:"description,omitempty"`
	FixtureIds  []string `json:"fixtureIds,omitempty"`
	// Left out = keep, null = remove the layout.
	Grid              datatypes.JSON `json:"grid,omitempty"`
	SortOrder         *int           `json:"sortOrder,omitempty"`
	AllowUserOverride *bool          `json:"allowUserOverride,omitempty"`
}

// UpsertFixtureGroupsReq is the body of POST /api/v2/events/{eventId}/fixture-groups.
type UpsertFixtureGroupsReq struct {
	FixtureGroups []UpsertFixtureGroupReq `json:"fixtureGroups"`
}

// DB model

type FixtureGroup struct {
	Base

	EventId string `json:"eventId" gorm:"type:uuid;not null;index"`

	Name        string `json:"name" gorm:"type:text;not null"`
	Description string `json:"description" gorm:"type:text;not null;default:''"`

	// Membership (patched_fixtures.id). Grid.cells is the optional layout for
	// effects; every cell's fixtureId must be in FixtureIds.
	FixtureIds datatypes.JSONSlice[string] `json:"fixtureIds" gorm:"type:jsonb;not null;default:'[]'"`
	Grid       datatypes.JSON              `json:"grid" gorm:"type:jsonb"` // Grid, nullable

	SortOrder int `json:"sortOrder" gorm:"not null;default:0"`

	// Whether users may override DMX values of this group's fixtures in a cue. Defaults to true; existing rows got
	// true from the column default. A pointer because GORM leaves a plain false bool with a default out of the
	// INSERT (so false would become true); a non-nil pointer is always written. Never nil once read from the DB.
	AllowUserOverride *bool `json:"allowUserOverride" gorm:"not null;default:true"`

	OptionSets []OptionSet `json:"optionSets,omitempty" gorm:"foreignKey:FixtureGroupId"`
}

func (FixtureGroup) TableName() string { return "v2.fixture_groups" }
