package models

import "gorm.io/datatypes"

type UpsertVisualiserReq struct {
	ID      string `json:"id,omitempty"`
	EventID string `json:"eventId"`

	DefaultViewport         datatypes.JSON `json:"defaultViewport,omitempty"`
	Objects2D               datatypes.JSON `json:"objects2D,omitempty"`
	Config3D                datatypes.JSON `json:"config3D,omitempty"`
	DefaultCameraView       datatypes.JSON `json:"defaultCameraView,omitempty"`
	Objects3D               datatypes.JSON `json:"objects3D,omitempty"`
	FixtureAttributeMapping datatypes.JSON `json:"fixtureAttributeMapping,omitempty"`
}

type Visualiser struct {
	Uuid           string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	LightEventUuid string `json:"-" gorm:"type:uuid;not null;uniqueIndex"`

	DefaultViewport datatypes.JSON `json:"defaultViewport" gorm:"type:jsonb"`

	Objects2D datatypes.JSON `json:"objects2D" gorm:"type:jsonb"`

	Config3D          datatypes.JSON `json:"config3D" gorm:"type:jsonb"`
	DefaultCameraView datatypes.JSON `json:"defaultCameraView" gorm:"type:jsonb"`
	Objects3D         datatypes.JSON `json:"objects3D" gorm:"type:jsonb"`

	FixtureAttributeMapping datatypes.JSON `json:"fixtureAttributeMapping" gorm:"type:jsonb"`
}
