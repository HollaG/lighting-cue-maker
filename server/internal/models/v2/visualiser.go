package v2

import "gorm.io/datatypes"

// Request DTOs. Keep these in sync with website/src/query-v2/visualiser.

// UpsertVisualiserReq: an event has one visualiser, so there is no id (the
// event comes from the URL). A field left out keeps its current value (on
// create: its default).
type UpsertVisualiserReq struct {
	Config3d          datatypes.JSON `json:"config3d,omitempty"`
	Objects3d         datatypes.JSON `json:"objects3d,omitempty"`
	DefaultCameraView datatypes.JSON `json:"defaultCameraView,omitempty"`
}

// UpsertVisualiserBody is the body of POST /api/v2/events/{eventId}/visualiser.
type UpsertVisualiserBody struct {
	Visualiser UpsertVisualiserReq `json:"visualiser"`
}

// DB model

// Visualiser holds the 3D scene for an event. One per event (unique index).
type Visualiser struct {
	Base

	EventId string `json:"eventId" gorm:"type:uuid;not null;uniqueIndex"`

	Config3d          datatypes.JSON `json:"config3d" gorm:"type:jsonb;not null;default:'{}'"`
	Objects3d         datatypes.JSON `json:"objects3d" gorm:"type:jsonb;not null;default:'[]'"`
	DefaultCameraView datatypes.JSON `json:"defaultCameraView" gorm:"type:jsonb"`
}

func (Visualiser) TableName() string { return "v2.visualisers" }
