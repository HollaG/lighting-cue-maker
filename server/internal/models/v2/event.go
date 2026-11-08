package v2

import "gorm.io/datatypes"

type Event struct {
	Base

	Name         string         `json:"name" gorm:"type:text;not null"`
	Description  string         `json:"description" gorm:"type:text;not null;default:''"`
	ExternalLink string         `json:"externalLink" gorm:"type:text;not null;default:''"`
	Metadata     datatypes.JSON `json:"metadata" gorm:"type:jsonb;not null;default:'{}'"`

	// Copies of fixture_templates rows (same shape). PatchedFixture.FixtureTemplateId
	// refers to a template in here, never to the library table.
	FixtureTemplates datatypes.JSON `json:"fixtureTemplates" gorm:"type:jsonb;not null;default:'[]'"`

	// Associations. They also create the foreign keys; load them with Preload.
	PatchedFixtures []PatchedFixture `json:"patchedFixtures,omitempty" gorm:"foreignKey:EventId;references:Uuid"`
	FixtureGroups   []FixtureGroup   `json:"fixtureGroups,omitempty" gorm:"foreignKey:EventId;references:Uuid"`
	Items           []Item           `json:"items,omitempty" gorm:"foreignKey:EventId;references:Uuid"`
	Visualiser      *Visualiser      `json:"visualiser,omitempty" gorm:"foreignKey:EventId;references:Uuid"`
}

func (Event) TableName() string { return "v2.events" }

// PatchedFixture is a "real" fixture placed in the event.
type PatchedFixture struct {
	Base

	EventId string `json:"eventId" gorm:"type:uuid;not null;index"`

	// IDs inside JSON (Event.FixtureTemplates and that template's modes), so no FK.
	FixtureTemplateId string `json:"fixtureTemplateId" gorm:"type:text;not null"`
	ModeId            string `json:"modeId" gorm:"type:text;not null"`

	Name string `json:"name" gorm:"type:text;not null;default:''"`

	// in cm
	PosX float64 `json:"posX" gorm:"not null;default:0"`
	PosY float64 `json:"posY" gorm:"not null;default:0"`
	PosZ float64 `json:"posZ" gorm:"not null;default:0"`

	// in degrees
	RotX float64 `json:"rotX" gorm:"not null;default:0"`
	RotY float64 `json:"rotY" gorm:"not null;default:0"`
	RotZ float64 `json:"rotZ" gorm:"not null;default:0"`
}

func (PatchedFixture) TableName() string { return "v2.patched_fixtures" }

type FixtureGroup struct {
	Base

	EventId string `json:"eventId" gorm:"type:uuid;not null;index"`

	Name        string `json:"name" gorm:"type:text;not null"`
	Description string `json:"description" gorm:"type:text;not null;default:''"`

	// Membership (patched_fixtures.uuid). Grid.cells is the optional layout for
	// effects; every cell's fixtureId must be in FixtureIds.
	FixtureIds datatypes.JSONSlice[string] `json:"fixtureIds" gorm:"type:jsonb;not null;default:'[]'"`
	Grid       datatypes.JSON              `json:"grid" gorm:"type:jsonb"` // Grid, nullable

	SortOrder int `json:"sortOrder" gorm:"not null;default:0"`

	OptionSets []OptionSet `json:"optionSets,omitempty" gorm:"foreignKey:FixtureGroupId;references:Uuid"`
}

func (FixtureGroup) TableName() string { return "v2.fixture_groups" }

type Visualiser struct {
	Base

	EventId string `json:"eventId" gorm:"type:uuid;not null;uniqueIndex"`

	Config3d          datatypes.JSON `json:"config3d" gorm:"type:jsonb;not null;default:'{}'"`
	Objects3d         datatypes.JSON `json:"objects3d" gorm:"type:jsonb;not null;default:'[]'"`
	DefaultCameraView datatypes.JSON `json:"defaultCameraView" gorm:"type:jsonb"`
}

func (Visualiser) TableName() string { return "v2.visualisers" }
