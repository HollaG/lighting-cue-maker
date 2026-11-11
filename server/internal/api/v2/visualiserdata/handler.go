// Package visualiserdata serves the whole event setup the cue resolver needs, in one request.
package visualiserdata

import (
	"database/sql"

	"lighting-cue-maker/server/internal/api/v2/eventscope"
	modelsv2 "lighting-cue-maker/server/internal/models/v2"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// getVisualiserData returns everything about the event's setup that turning a cue into DMX values needs:
// the patched fixtures, the event's fixture templates, the fixture groups and every option set of those groups.
//
// The four reads run in one read-only REPEATABLE READ transaction, so they all see the same moment:
// an LD edit in between can't give, say, option sets of a group this response doesn't contain.
func getVisualiserData(c *gin.Context) {
	eventId := eventscope.EventId(c)

	var event modelsv2.Event
	fixtures := []modelsv2.PatchedFixture{}
	fixtureGroups := []modelsv2.FixtureGroup{}
	optionSets := []modelsv2.OptionSet{}

	err := database.DB().Transaction(func(tx *gorm.DB) error {
		if err := tx.Select("id", "fixture_templates").First(&event, "id = ?", eventId).Error; err != nil {
			return err
		}

		// Same order as GET /patched-fixtures.
		if err := tx.Where("event_id = ?", eventId).
			Order("name ASC").Order("created_at ASC").
			Find(&fixtures).Error; err != nil {
			return err
		}

		// Same order as GET /fixture-groups. The resolver's write order starts with group sortOrder.
		if err := tx.Where("event_id = ?", eventId).
			Order("sort_order ASC").Order("created_at ASC").
			Find(&fixtureGroups).Error; err != nil {
			return err
		}

		// Option sets of this event's (not deleted) groups. Each row has fixtureGroupId, so the client groups them.
		groupIds := tx.Model(&modelsv2.FixtureGroup{}).Select("id").Where("event_id = ?", eventId)
		return tx.Where("fixture_group_id IN (?)", groupIds).
			Order("fixture_group_id ASC").Order("sort_order ASC").Order("created_at ASC").
			Find(&optionSets).Error
	}, &sql.TxOptions{Isolation: sql.LevelRepeatableRead, ReadOnly: true})

	if err != nil {
		response.InternalError(c, "Failed to get visualiser data")
		return
	}

	fixtureTemplates := event.FixtureTemplates
	if len(fixtureTemplates) == 0 {
		fixtureTemplates = datatypes.JSON(`[]`)
	}

	response.OK(c, map[string]any{
		"fixtures":         fixtures,
		"fixtureTemplates": fixtureTemplates,
		"fixtureGroups":    fixtureGroups,
		"optionSets":       optionSets,
	})
}
