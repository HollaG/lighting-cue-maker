package v2

import "gorm.io/datatypes"

// Item is a song/segment. It has no order field yet (deferred).
type Item struct {
	Base

	EventId string `json:"eventId" gorm:"type:uuid;not null;index"`

	Name     string `json:"name" gorm:"type:text;not null"`
	Comments string `json:"comments" gorm:"type:text;not null;default:''"`
	// Source of truth for cue order: cues are ordered by their markers in here.
	RawLyrics string `json:"rawLyrics" gorm:"type:text;not null;default:''"`

	Cues []Cue `json:"cues,omitempty" gorm:"foreignKey:ItemId;references:Uuid"`
}

func (Item) TableName() string { return "v2.items" }

// CueFields are shared by Cue and AlternateCue.
type CueFields struct {
	Comments   string         `json:"comments" gorm:"type:text;not null;default:''"`
	Transition datatypes.JSON `json:"transition" gorm:"type:jsonb;not null;default:'{}'"` // CueTransition
	Mode       string         `json:"mode" gorm:"type:text;not null;default:''"`          // CueMode

	ActiveFixtureGroupIds datatypes.JSONSlice[string] `json:"activeFixtureGroupIds" gorm:"type:jsonb;not null;default:'[]'"`
	// Selectable IDs inside option_sets.selectables. GIN index for "used in N cues" queries.
	SelectableIds datatypes.JSONSlice[string] `json:"selectableIds" gorm:"type:jsonb;not null;default:'[]';index:,type:gin"`
	// { [fixtureId]: { [channelId]: int } }
	Overrides datatypes.JSON `json:"overrides" gorm:"type:jsonb;not null;default:'{}'"`
}

// Cue has no order field: its position comes from Item.RawLyrics.
type Cue struct {
	Base

	ItemId string `json:"itemId" gorm:"type:uuid;not null;index"`

	CueFields

	AlternateCues []AlternateCue `json:"alternateCues,omitempty" gorm:"foreignKey:CueUuid;references:Uuid"`
}

func (Cue) TableName() string { return "v2.cues" }

type AlternateCue struct {
	Base

	CueUuid string `json:"cueId" gorm:"type:uuid;not null;index"`

	CueFields
}

func (AlternateCue) TableName() string { return "v2.alternate_cues" }
