package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Request DTOs
type CreateBumpReq struct {
	ItemId string `json:"itemId"`
}

type UpdateBumpReq struct {
	Assignments *map[string]any `json:"assignments,omitempty"`
	Comments    *string         `json:"comments,omitempty"`
}

// DB model
type Bump struct {
	Uuid string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`

	ItemUuid string `json:"-" gorm:"type:uuid;not null"`

	Assignments datatypes.JSON `json:"assignments" gorm:"serializer:json"`

	Comments string `json:"comments"`

	CreatedAt time.Time      `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt time.Time      `json:"updatedAt" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"deletedAt" gorm:"index"`
}
