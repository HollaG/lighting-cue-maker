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
	ID        uint           `json:"-" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt time.Time      `json:"updatedAt" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"deletedAt" gorm:"index"`

	LightEventID uint `json:"-"`

	Uuid string `json:"id" gorm:"type:uuid;default:gen_random_uuid();uniqueIndex:idx_uuid_fg,where:deleted_at IS NULL"`

	Name      string `json:"name"`
	RawLyrics string `json:"rawLyrics"` // encode the cue id inside where needed

	Content map[string]any `json:"metadata" gorm:"serializer:json"`
}
