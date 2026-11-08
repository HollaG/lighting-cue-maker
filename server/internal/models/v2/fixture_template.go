package v2

import "gorm.io/datatypes"

// FixtureTemplate is the global, CueSketch-specific fixture library shared by
// all events. Events copy templates into Event.FixtureTemplates, so nothing in
// an event points at this table.
type FixtureTemplate struct {
	Base

	Name         string `json:"name" gorm:"type:text;not null"`
	Manufacturer string `json:"manufacturer" gorm:"type:text;not null;default:''"`
	Model        string `json:"model" gorm:"type:text;not null;default:''"`
	Type         string `json:"type" gorm:"type:text;not null"` // FixtureType: par, bar, moving head, ...

	Channels   datatypes.JSON `json:"channels" gorm:"type:jsonb;not null;default:'[]'"`   // Channel[]
	Modes      datatypes.JSON `json:"modes" gorm:"type:jsonb;not null;default:'[]'"`      // Mode[] (heads live inside each mode)
	Properties datatypes.JSON `json:"properties" gorm:"type:jsonb;not null;default:'{}'"` // PhysicalProperties

	ModelUrl   *string `json:"modelUrl" gorm:"type:text"`   // link to the 3D model
	ImportType *string `json:"importType" gorm:"type:text"` // ConsoleType
	RawSource  *string `json:"rawSource" gorm:"type:text"`  // original file, e.g. .qxf
}

func (FixtureTemplate) TableName() string { return "v2.fixture_templates" }
