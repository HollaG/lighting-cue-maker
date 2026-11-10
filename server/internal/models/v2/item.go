package v2

import "time"

// UpsertItemReq: no id = create, id = update. A field left out keeps its
// current value (on create: its default; name is required on create). The
// event comes from the URL.
type UpsertItemReq struct {
	Id        *string `json:"id,omitempty"`
	Name      *string `json:"name,omitempty"`
	Comments  *string `json:"comments,omitempty"`
	RawLyrics *string `json:"rawLyrics,omitempty"`
}

// UpsertItemReqBody is the body of POST /api/v2/events/{eventId}/items.
// One item per request (no bulk): many users edit items at once.
type UpsertItemReqBody struct {
	Item UpsertItemReq `json:"item"`
}

// ItemOverview is the lightweight list row: no lyrics, no cues.
type ItemOverview struct {
	Id        string    `json:"id"`
	EventId   string    `json:"eventId"`
	Name      string    `json:"name"`
	Comments  string    `json:"comments"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Item is a song/segment. It has no order field yet (deferred).
type Item struct {
	Base

	EventId string `json:"eventId" gorm:"type:uuid;not null;index"`

	Name     string `json:"name" gorm:"type:text;not null"`
	Comments string `json:"comments" gorm:"type:text;not null;default:''"`
	// Source of truth for cue order: cues are ordered by their markers in here.
	RawLyrics string `json:"rawLyrics" gorm:"type:text;not null;default:''"`

	// Associations
	Cues []Cue `json:"cues,omitempty" gorm:"foreignKey:ItemId"`
}

func (Item) TableName() string { return "v2.items" }
