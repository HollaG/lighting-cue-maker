package v2

import "gorm.io/datatypes"

// EventStatus says whether the LD has finished setting up the event.
// Keep in sync with EventStatus in website/src/types-v2/event.ts.
type EventStatus string

const (
	// The LD is still going through the setup steps. Users can't see or open the event.
	EventStatusConfiguring EventStatus = "configuring"
	// Setup is done. Users can pick options per cue.
	EventStatusReady EventStatus = "ready"
)

// Valid reports whether s is a known event status. Check it in handlers before saving.
func (s EventStatus) Valid() bool {
	switch s {
	case EventStatusConfiguring, EventStatusReady:
		return true
	}
	return false
}

// Request DTOs. Keep these in sync with website/src/query-v2/events.

// UpsertEventReq is the editable part of an event (UpsertLightEvent in TS).
type UpsertEventReq struct {
	// Ignored on create; the database generates the ID.
	Id           *string        `json:"id,omitempty"`
	Name         string         `json:"name"`
	Description  *string        `json:"description,omitempty"`
	ExternalLink *string        `json:"externalLink,omitempty"`
	Metadata     datatypes.JSON `json:"metadata,omitempty"`
	// Ignored on create (always configuring). Only the update endpoint changes it.
	Status *EventStatus `json:"status,omitempty"`
}

// CreateEventReq is the body of POST /api/v2/events.
type CreateEventReq struct {
	Event UpsertEventReq `json:"event"`
	// Library templates to copy into the event. The server does the copying.
	FixtureTemplateIds []string `json:"fixtureTemplateIds"`
}

// UpdateEventReq is the body of PATCH /api/v2/events/{eventId}.
type UpdateEventReq struct {
	// nil = leave the event's own fields alone (e.g. when only adding fixture templates).
	Event *UpsertEventReq `json:"event,omitempty"`
	// Library templates to copy into the event. The server does the copying.
	FixtureTemplateIds []string `json:"fixtureTemplateIds"`
}

// DB model

type Event struct {
	Base

	Name         string         `json:"name" gorm:"type:text;not null"`
	Description  string         `json:"description" gorm:"type:text;not null;default:''"`
	ExternalLink string         `json:"externalLink" gorm:"type:text;not null;default:''"`
	Metadata     datatypes.JSON `json:"metadata" gorm:"type:jsonb;not null;default:'{}'"`
	Status       EventStatus    `json:"status" gorm:"type:text;not null;default:'configuring'"`

	// Copies of fixture_templates rows (same shape). PatchedFixture.FixtureTemplateId
	// refers to a template in here, never to the library table.
	FixtureTemplates datatypes.JSON `json:"fixtureTemplates" gorm:"type:jsonb;not null;default:'[]'"`

	// Associations. They also create the foreign keys; load them with Preload.
	PatchedFixtures []PatchedFixture `json:"patchedFixtures,omitempty" gorm:"foreignKey:EventId"`
	FixtureGroups   []FixtureGroup   `json:"fixtureGroups,omitempty" gorm:"foreignKey:EventId"`
	Items           []Item           `json:"items,omitempty" gorm:"foreignKey:EventId"`
	Visualiser      *Visualiser      `json:"visualiser,omitempty" gorm:"foreignKey:EventId"`
}

func (Event) TableName() string { return "v2.events" }
