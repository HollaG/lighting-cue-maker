package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
	// datatypes is used only by the DB models below; the DTOs use plain Go types.
)

// Request
type CreateItemReq struct {
	Name string `json:"name"`
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

// Nothing
type CreateCueReq struct {
}

type UpdateCueReq struct {
	Assignments *map[string]any `json:"assignments,omitempty"`
	Comments    *string         `json:"comments,omitempty"`
}

type Cue struct {
	Uuid string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`

	ItemUuid string `json:"-" gorm:"type:uuid;not null"`

	Assignments datatypes.JSON `json:"assignments" gorm:"serializer:json"`

	Comments string `json:"comments"`

	CreatedAt time.Time      `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt time.Time      `json:"updatedAt" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"deletedAt" gorm:"index"`
}
