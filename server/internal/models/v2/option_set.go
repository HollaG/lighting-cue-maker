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
	// A plain dropdown of names. No effect on DMX.
	OptionSetTypeValueless OptionSetType = "Valueless"
)

// Request DTOs. Keep these in sync with website/src/query-v2/option-sets.

// UpsertOptionSetReq: no id = create, id = update. A field left out keeps its
// current value (on create: its default; name, selectionType and type are
// required on create). The event and fixture group come from the URL.
type UpsertOptionSetReq struct {
	Id            *string                 `json:"id,omitempty"`
	Name          *string                 `json:"name,omitempty"`
	Description   *string                 `json:"description,omitempty"`
	SortOrder     *int                    `json:"sortOrder,omitempty"`
	Priority      *int                    `json:"priority,omitempty"`
	SelectionType *OptionSetSelectionType `json:"selectionType,omitempty"`
	Type          *OptionSetType          `json:"type,omitempty"`
	// Selectable[]. Replaced as a whole.
	Selectables          datatypes.JSON `json:"selectables,omitempty"`
	DefaultSelectableIds []string       `json:"defaultSelectableIds,omitempty"`
	Required             *bool          `json:"required,omitempty"`
}

// UpsertOptionSetsReq is the body of POST /api/v2/events/{eventId}/fixture-groups/{fixtureGroupId}/option-sets.
type UpsertOptionSetsReq struct {
	OptionSets []UpsertOptionSetReq `json:"optionSets"`
}

// DB model

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
