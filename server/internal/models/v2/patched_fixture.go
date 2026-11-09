package v2

// Request DTOs. Keep these in sync with website/src/types-v2/patchedFixture.ts
// and website/src/query-v2/patched-fixtures.

// UpsertPatchedFixtureReq: no id = create, id = update (all fields are replaced).
// The event comes from the URL.
type UpsertPatchedFixtureReq struct {
	Id                *string `json:"id,omitempty"`
	FixtureTemplateId string  `json:"fixtureTemplateId"`
	ModeId            string  `json:"modeId"`
	Name              string  `json:"name"`

	PosX float64 `json:"posX"`
	PosY float64 `json:"posY"`
	PosZ float64 `json:"posZ"`

	RotX float64 `json:"rotX"`
	RotY float64 `json:"rotY"`
	RotZ float64 `json:"rotZ"`
}

// UpsertPatchedFixturesReq is the body of POST /api/v2/events/{eventId}/patched-fixtures.
type UpsertPatchedFixturesReq struct {
	Fixtures []UpsertPatchedFixtureReq `json:"fixtures"`
}

// DB model

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
