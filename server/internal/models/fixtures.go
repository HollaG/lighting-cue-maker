package models

import (
	"time"

	"gorm.io/gorm"
)

// DTO
type CreateFixtureReq struct {
	FixtureGroupId string `json:"fixtureGroupId"`
	Name           string `json:"name"`
	Type           string `json:"type"` // 'par' 'bar' 'moving_head'

	PosX float64 `json:"posX"`
	PosY float64 `json:"posY"`
	PosZ float64 `json:"posZ"`

	RotX      float64 `json:"rotX"`
	RotY      float64 `json:"rotY"`
	RotZ      float64 `json:"rotZ"`
	BeamAngle float64 `json:"beamAngle"`
}

// Model
type Fixture struct {
	Uuid string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`

	FixtureGroupUuid string `json:"fixtureGroupId" gorm:"type:uuid;not null"`

	Name string `json:"name"`
	Type string `json:"type"` // 'par' 'bar' 'moving_head'

	// in CM
	PosX float64 `json:"posX"`
	PosY float64 `json:"posY"`
	PosZ float64 `json:"posZ"`

	// in Degrees
	RotX      float64 `json:"rotX"`
	RotY      float64 `json:"rotY"`
	RotZ      float64 `json:"rotZ"`
	BeamAngle float64 `json:"beamAngle"`

	CreatedAt time.Time      `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt time.Time      `json:"updatedAt" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"deletedAt" gorm:"index"`
}
