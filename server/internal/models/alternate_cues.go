package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Request DTOs
type UpsertAlternateCueReq struct {
	Id            string            `json:"id,omitempty"`
	AlternateName *string           `json:"alternateName,omitempty"`
	AlternateType *AlternateCueType `json:"alternateType,omitempty" binding:"omitempty,oneof=user ai"`
	Assignments   *map[string]any   `json:"assignments,omitempty"`
	Comments      *string           `json:"comments,omitempty"`
	Transition    datatypes.JSON    `json:"transition,omitempty"`
	CueConfig     datatypes.JSON    `json:"cueConfig,omitempty"`
	UpdatedBy     *string           `json:"updatedBy,omitempty" binding:"omitempty,uuid"`
}

type AlternateCueType string

const (
	AlternateCueTypeNormal AlternateCueType = "user"
	AlternateCueTypeAi     AlternateCueType = "ai"
)

// DB Model
type AlternateCue struct {

	// note that it is `alternateId` in JSON
	Uuid string `json:"alternateId" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`

	// note that it is `id` in JSON - this matches the expected struct of Cue.
	CueUuid string `json:"id" gorm:"type:uuid;not null;index"`

	Name string           `json:"alternateName" gorm:"type:text;not null"`
	Type AlternateCueType `json:"alternateType" gorm:"type:text;not null"`

	// These fields are the same as `Cue` struct
	Assignments datatypes.JSON `json:"assignments" gorm:"serializer:json"`
	CueConfig   datatypes.JSON `json:"cueConfig" gorm:"type:jsonb;not null;default:'{\"mode\":\"unknown\"}'"`
	Transition  datatypes.JSON `json:"transition" gorm:"type:jsonb;not null;default:'{\"holdTimeMs\":-1,\"transitionTimeMs\":0}'"`

	Comments string `json:"comments"`

	CreatedAt time.Time      `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt time.Time      `json:"updatedAt" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"deletedAt" gorm:"index"`

	UpdatedBy *string `json:"updatedBy,omitempty" gorm:"type:uuid"`
}
