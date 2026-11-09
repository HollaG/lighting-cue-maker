package v2

// Item is a song/segment. It has no order field yet (deferred).
type Item struct {
	Base

	EventId string `json:"eventId" gorm:"type:uuid;not null;index"`

	Name     string `json:"name" gorm:"type:text;not null"`
	Comments string `json:"comments" gorm:"type:text;not null;default:''"`
	// Source of truth for cue order: cues are ordered by their markers in here.
	RawLyrics string `json:"rawLyrics" gorm:"type:text;not null;default:''"`

	Cues []Cue `json:"cues,omitempty" gorm:"foreignKey:ItemId"`
}

func (Item) TableName() string { return "v2.items" }
