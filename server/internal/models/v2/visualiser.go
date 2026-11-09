package v2

import "gorm.io/datatypes"

// Visualiser holds the 3D scene for an event. One per event (unique index).
type Visualiser struct {
	Base

	EventId string `json:"eventId" gorm:"type:uuid;not null;uniqueIndex"`

	Config3d          datatypes.JSON `json:"config3d" gorm:"type:jsonb;not null;default:'{}'"`
	Objects3d         datatypes.JSON `json:"objects3d" gorm:"type:jsonb;not null;default:'[]'"`
	DefaultCameraView datatypes.JSON `json:"defaultCameraView" gorm:"type:jsonb"`
}

func (Visualiser) TableName() string { return "v2.visualisers" }
