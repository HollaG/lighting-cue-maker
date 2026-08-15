package models

import "gorm.io/datatypes"

type UpsertVisualiserReq struct {
	ID      string `json:"id,omitempty"`
	EventID string `json:"eventId"`

	CanvasWidth  float64        `json:"canvasWidth"`
	CanvasHeight float64        `json:"canvasHeight"`
	Objects2D    datatypes.JSON `json:"objects2D"`
}

type Visualiser struct {
	Uuid           string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	LightEventUuid string `json:"-" gorm:"type:uuid;not null;uniqueIndex"`

	// in CM
	CanvasWidth  float64 `json:"canvasWidth"`
	CanvasHeight float64 `json:"canvasHeight"`

	Objects2D datatypes.JSON `json:"objects2D" gorm:"type:jsonb"`
}
