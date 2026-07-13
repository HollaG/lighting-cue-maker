package models

import "time"

type CreateLightEventReq struct {
	Name              string                      `json:"name"`
	CuesPerBand       int                         `json:"cuesPerBand"`
	UniqueCuesPerBand int                         `json:"uniqueCuesPerBand"`
	FixtureGroups     []FixtureGroupConfiguration `json:"fixtureGroups"`

	// optional
	Description string `json:"description,omitempty"`
}

type LightEvent struct {
	CreateLightEventReq

	ID        string    `json:"id"`
	CreatedAt time.Time `json:"created_at,omitempty"`
	UpdatedAt time.Time `json:"updated_at,omitempty"`
}

type FixtureGroupConfiguration struct {
	ID         string                   `json:"id"`
	Name       string                   `json:"name"`
	Attributes []AttributeConfiguration `json:"attributes"`
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
	Select      []Option       `json:"select,omitempty"`
	Multiselect []Option       `json:"multiselect,omitempty"`
	Colour      []ColourOption `json:"colour,omitempty"`
	Slider      *SliderOption  `json:"slider,omitempty"`
	Boolean     *BooleanOption `json:"boolean,omitempty"`
	// Text and None have no options (null in TS), so no field needed.
}

// AttributeConfiguration is the top-level attribute definition.
type AttributeConfiguration struct {
	ID       string               `json:"id"`
	Name     string               `json:"name"`
	Type     AttributeType        `json:"type"`
	Metadata map[string]any       `json:"metadata"`
	Options  AttributeTypeOptions `json:"optionPossibleValues"`
}
