package models

import "gorm.io/datatypes"

type UpsertVisualiserReq struct {
	ID      string `json:"id,omitempty"`
	EventID string `json:"eventId"`

	DefaultViewport datatypes.JSON `json:"defaultViewport,omitempty"`
	Objects2D       datatypes.JSON `json:"objects2D,omitempty"`
}

type Visualiser struct {
	Uuid           string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	LightEventUuid string `json:"-" gorm:"type:uuid;not null;uniqueIndex"`

	DefaultViewport datatypes.JSON `json:"defaultViewport" gorm:"type:jsonb"`

	Objects2D datatypes.JSON `json:"objects2D" gorm:"type:jsonb"`
}
