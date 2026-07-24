package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Request DTOs
type CreateItemReq struct {
	EventId string `json:"eventId"`
	Name    string `json:"name"`
}

// same as CreateItemReq except all fields are optional.
// Plain Go types only — no GORM dependencies in the DTO layer.
type UpdateItemReq struct {
	Name      *string         `json:"name,omitempty"`
	RawLyrics *string         `json:"rawLyrics,omitempty"`
	Content   *map[string]any `json:"content,omitempty"`
	// Cues      []Cue          `json:"cues,omitempty"`
}

// DB model
type Item struct {
	Uuid string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`

	LightEventUuid string `json:"-" gorm:"type:uuid;not null"`

	Name      string         `json:"name"`
	RawLyrics string         `json:"rawLyrics"` // encode the cue id inside where needed
	Content   datatypes.JSON `json:"content" gorm:"serializer:json"`

	Cues []Cue `json:"cues" gorm:"foreignKey:ItemUuid;references:Uuid"`

	CreatedAt time.Time      `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt time.Time      `json:"updatedAt" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"deletedAt" gorm:"index"`
}
