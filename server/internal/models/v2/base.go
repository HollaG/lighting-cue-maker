// Package v2 holds the CueSketch v2 database models. All tables live in the
// "v2" Postgres schema; v1 tables in "public" are untouched.
//
// The data structures follow the draw.io "version 2" design. Rules the diagram
// can't show are in website/docs/v2-implementation-notes.md.
package v2

import (
	"time"

	"gorm.io/gorm"
)

// Base is embedded in every v2 table.
type Base struct {
	Id string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`

	CreatedAt time.Time      `json:"createdAt" gorm:"not null;autoCreateTime"`
	UpdatedAt time.Time      `json:"updatedAt" gorm:"not null;autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"deletedAt" gorm:"index"`
}
