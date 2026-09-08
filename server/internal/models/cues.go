package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Request DTOs
type CreateCueReq struct {
	ItemId    string         `json:"itemId"`
	CueConfig datatypes.JSON `json:"cueConfig,omitempty"`
}

type UpdateCueReq struct {
	Assignments *map[string]any `json:"assignments,omitempty"`
	Comments    *string         `json:"comments,omitempty"`
	CueConfig   datatypes.JSON  `json:"cueConfig,omitempty"`
}

// DB Model
type Cue struct {
	Uuid string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`

	ItemUuid string `json:"-" gorm:"type:uuid;not null"`

	Assignments datatypes.JSON `json:"assignments" gorm:"serializer:json"`
	CueConfig   datatypes.JSON `json:"cueConfig" gorm:"type:jsonb;not null;default:'{\"mode\":\"unknown\"}'"`

	Comments string `json:"comments"`

	CreatedAt time.Time      `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt time.Time      `json:"updatedAt" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"deletedAt" gorm:"index"`
}
