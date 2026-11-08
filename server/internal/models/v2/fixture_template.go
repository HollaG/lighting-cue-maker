package v2

import "gorm.io/datatypes"

// ConsoleType is the lighting console/software a fixture was imported from
// (and later exported to). Only QLC+ is supported for now.
type ConsoleType string

const (
	ConsoleTypeQlcPlus  ConsoleType = "qlcplus"
	ConsoleTypeGrandMA2 ConsoleType = "grandma2"
	ConsoleTypeGrandMA3 ConsoleType = "grandma3"
	ConsoleTypeAvolites ConsoleType = "avolites"
)

// Valid reports whether t is a known console type. Check it in handlers before saving.
func (t ConsoleType) Valid() bool {
	switch t {
	case ConsoleTypeQlcPlus, ConsoleTypeGrandMA2, ConsoleTypeGrandMA3, ConsoleTypeAvolites:
		return true
	}
	return false
}

// Type refers to what sort of fixture it is. This helps for classification.
// We support: par, bar_beam, bar_pixel, moving_head, other for now.
type FixtureType string

const (
	FixtureTypePar        FixtureType = "par"
	FixtureTypeBarBeam    FixtureType = "bar_beam"
	FixtureTypeBarPixel   FixtureType = "bar_pixel"
	FixtureTypeMovingHead FixtureType = "moving_head"
	FixtureTypeOther      FixtureType = "other"
)

// Valid reports whether t is a known fixture type. Check it in handlers before saving.
func (t FixtureType) Valid() bool {
	switch t {
	case FixtureTypePar, FixtureTypeBarBeam, FixtureTypeBarPixel, FixtureTypeMovingHead, FixtureTypeOther:
		return true
	}
	return false
}

// FixtureTemplate is the global, CueSketch-specific fixture library shared by
// all events. Events copy templates into Event.FixtureTemplates, so nothing in
// an event points at this table.
type FixtureTemplate struct {
	Base

	Name         string      `json:"name" gorm:"type:text;not null"`
	Manufacturer string      `json:"manufacturer" gorm:"type:text;not null;default:''"`
	Model        string      `json:"model" gorm:"type:text;not null;default:''"`
	Type         FixtureType `json:"type" gorm:"type:text;not null"`

	Channels   datatypes.JSON `json:"channels" gorm:"type:jsonb;not null;default:'[]'"`   // Channel[]
	Modes      datatypes.JSON `json:"modes" gorm:"type:jsonb;not null;default:'[]'"`      // Mode[] (heads live inside each mode)
	Properties datatypes.JSON `json:"properties" gorm:"type:jsonb;not null;default:'{}'"` // PhysicalProperties

	ModelUrl   *string      `json:"modelUrl" gorm:"type:text"`   // link to the 3D model
	ImportType *ConsoleType `json:"importType" gorm:"type:text"` // console the template was imported from
	RawSource  *string      `json:"rawSource" gorm:"type:text"`  // original file, e.g. .qxf
}

func (FixtureTemplate) TableName() string { return "v2.fixture_templates" }
