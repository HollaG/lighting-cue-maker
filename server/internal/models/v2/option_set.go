package v2

import "gorm.io/datatypes"

type OptionSetSelectionType string

const (
	OptionSetSelectionSingle OptionSetSelectionType = "SINGLE"
	OptionSetSelectionMulti  OptionSetSelectionType = "MULTI"
	OptionSetSelectionBool   OptionSetSelectionType = "BOOL"
)

type OptionSetType string

const (
	OptionSetTypeIntensity OptionSetType = "Intensity"
	OptionSetTypeColour    OptionSetType = "Colour"
	OptionSetTypePosition  OptionSetType = "Position"
	// Pattern and movement selectables use Custom (simple dropdown).
	OptionSetTypeCustom OptionSetType = "Custom"
)

// OptionSet is a group of Selectables (options).
type OptionSet struct {
	Base

	FixtureGroupId string `json:"fixtureGroupId" gorm:"type:uuid;not null;index"`

	Name        string `json:"name" gorm:"type:text;not null"`
	Description string `json:"description" gorm:"type:text;not null;default:''"`

	SortOrder int `json:"sortOrder" gorm:"not null;default:0"` // order of appearance
	Priority  int `json:"priority" gorm:"not null;default:0"`  // application order (TODO in the design)

	SelectionType OptionSetSelectionType `json:"selectionType" gorm:"type:text;not null"`
	Type          OptionSetType          `json:"type" gorm:"type:text;not null"`

	// Selectable[]; selectable order is the array position.
	Selectables datatypes.JSON `json:"selectables" gorm:"type:jsonb;not null;default:'[]'"`
	// Copied into a cue when it is created.
	DefaultSelectableIds datatypes.JSONSlice[string] `json:"defaultSelectableIds" gorm:"type:jsonb;not null;default:'[]'"`

	Required bool `json:"required" gorm:"not null;default:false"`
}

func (OptionSet) TableName() string { return "v2.option_sets" }
