package v2

import "gorm.io/datatypes"

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

// UpsertCueReq: no id = create, id = update. A field left out keeps its
// current value (on create: its default). The item comes from the URL.
type UpsertCueReq struct {
	Id                    *string        `json:"id,omitempty"`
	Comments              *string        `json:"comments,omitempty"`
	Transition            datatypes.JSON `json:"transition,omitempty"` // object, replaced as a whole
	Mode                  *string        `json:"mode,omitempty"`
	ActiveFixtureGroupIds []string       `json:"activeFixtureGroupIds,omitempty"`
	SelectableIds         []string       `json:"selectableIds,omitempty"`
	Overrides             datatypes.JSON `json:"overrides,omitempty"` // object, replaced as a whole
}

// UpsertCueReqBody is the body of POST /api/v2/events/{eventId}/items/{itemId}/cues.
// One cue per request (no bulk): many users edit cues at once.
type UpsertCueReqBody struct {
	Cue UpsertCueReq `json:"cue"`
}

// Cue has no order field: its position comes from Item.RawLyrics.
type Cue struct {
	Base

	ItemId string `json:"itemId" gorm:"type:uuid;not null;index"`

	CueFields

	AlternateCues []AlternateCue `json:"alternateCues,omitempty" gorm:"foreignKey:CueId"`
}

func (Cue) TableName() string { return "v2.cues" }
