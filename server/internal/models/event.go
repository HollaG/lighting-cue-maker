package models

import (
	"gorm.io/gorm"
)

// Used for POST /events to create an event
type CreateLightEventReq struct {
	Name              string                               `json:"name"`
	CuesPerBand       int                                  `json:"cuesPerBand"`
	UniqueCuesPerBand int                                  `json:"uniqueCuesPerBand"`
	FixtureGroups     []CreateFixtureGroupConfigurationReq `json:"fixtureGroups"`

	// optional
	Description string `json:"description,omitempty"`
}

type CreateFixtureGroupConfigurationReq struct {
	Name       string                            `json:"name"`
	Attributes []CreateAttributeConfigurationReq `json:"attributes"`
}

type CreateAttributeConfigurationReq struct {
	Name     string               `json:"name"`
	Type     AttributeType        `json:"type"`
	Metadata map[string]any       `json:"metadata"`
	Options  AttributeTypeOptions `json:"optionPossibleValues"`
}

// ------------------------------------------------

// DB model
type LightEvent struct {
	Uuid string `json:"id" gorm:"type:uuid;default:gen_random_uuid();uniqueIndex:idx_uuid_event,where:deleted_at IS NULL"`

	Name              string                      `json:"name"`
	CuesPerBand       int                         `json:"cuesPerBand"`
	UniqueCuesPerBand int                         `json:"uniqueCuesPerBand"`
	FixtureGroups     []FixtureGroupConfiguration `json:"fixtureGroups"`

	gorm.Model
}

type FixtureGroupConfiguration struct {
	Uuid string `json:"id" gorm:"type:uuid;default:gen_random_uuid();uniqueIndex:idx_uuid_fg,where:deleted_at IS NULL"`

	LightEventID uint                     `json:"-"`
	Name         string                   `json:"name"`
	Attributes   []AttributeConfiguration `json:"attributes"`

	gorm.Model
}

// AttributeType is the kind of attribute (mirrors the TS const enum).
type AttributeType string

const (
	AttributeTypeText        AttributeType = "text"
	AttributeTypeSelect      AttributeType = "select"
	AttributeTypeMultiselect AttributeType = "multiselect"
	AttributeTypeColour      AttributeType = "colour"
	AttributeTypeSlider      AttributeType = "slider"
	AttributeTypeBoolean     AttributeType = "boolean"
	AttributeTypeNone        AttributeType = "none" // Illegal type!
)

// Option is a single select / multiselect choice.
type Option struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// ColourOption represents a named colour.
type ColourOption struct {
	Hex  string `json:"hex"`
	Name string `json:"name"`
}

// BooleanOption is the default state for a boolean attribute.
type BooleanOption string

const (
	BooleanOptionChecked   BooleanOption = "checkedDefault"
	BooleanOptionUnchecked BooleanOption = "uncheckedDefault"
)

// SliderOption defines the range for a slider attribute.
type SliderOption struct {
	Min float64 `json:"min"`
	Max float64 `json:"max"`
}

// Please note that the key of the map MUST be from `type AttributeType`.
type AttributeTypeOptions struct {
	Select      []string       `json:"select,omitempty"`
	Multiselect []string       `json:"multiselect,omitempty"`
	Colour      []ColourOption `json:"colour,omitempty"`
	Slider      *SliderOption  `json:"slider,omitempty"`
	Boolean     *BooleanOption `json:"boolean,omitempty"`
	// Text and None have no options (null in TS), so no field needed.
}

// AttributeConfiguration is the top-level attribute definition.
type AttributeConfiguration struct {
	Uuid string `json:"id" gorm:"type:uuid;default:gen_random_uuid();uniqueIndex:idx_uuid_attr,where:deleted_at IS NULL"`

	FixtureGroupConfigurationID uint                 `json:"-"`
	Name                        string               `json:"name"`
	Type                        AttributeType        `json:"type"`
	Metadata                    map[string]any       `json:"metadata" gorm:"serializer:json"`
	Options                     AttributeTypeOptions `json:"optionPossibleValues" gorm:"serializer:json"`

	gorm.Model
}
