package models

import (
	"time"

	"gorm.io/gorm"
)

// Request
type CreateItemReq struct {
	Name string `json:"name"`
}

// DB model
type Item struct {
	Uuid string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`

	LightEventUuid string `json:"-" gorm:"type:uuid;not null"`

	Name      string         `json:"name"`
	RawLyrics string         `json:"rawLyrics"` // encode the cue id inside where needed
	Content   map[string]any `json:"metadata" gorm:"serializer:json"`

	CreatedAt time.Time      `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt time.Time      `json:"updatedAt" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"deletedAt" gorm:"index"`
}
