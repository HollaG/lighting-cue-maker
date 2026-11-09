package fixturegroups

import (
	"fmt"
	"strings"

	"lighting-cue-maker/server/internal/api/v2/eventscope"
	modelsv2 "lighting-cue-maker/server/internal/models/v2"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// rowError points at one entry of the request's fixtureGroups array.
type rowError struct {
	Index int    `json:"index"`
	Error string `json:"error"`
}

// upsertFixtureGroups creates (no id) or updates (id) several fixture groups
// in one transaction. Groups not in the request are left alone. The response
// lists the saved groups in request order, so new IDs line up by index.
func upsertFixtureGroups(c *gin.Context) {
	eventId := eventscope.EventId(c)

	var req modelsv2.UpsertFixtureGroupsReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	// Check ID formats first: Postgres errors on a non-UUID in "id IN ?".
	if errs := validateIds(req.FixtureGroups); len(errs) > 0 {
		response.BadRequest(c, "Invalid fixture groups", map[string]any{"errors": errs})
		return
	}

	groupIds, fixtureIds := collectIds(req.FixtureGroups)

	// Groups being updated must belong to this event (and not be deleted).
	existing := map[string]modelsv2.FixtureGroup{}
	if len(groupIds) > 0 {
		var found []modelsv2.FixtureGroup
		if err := database.DB().Where("event_id = ? AND id IN ?", eventId, groupIds).Find(&found).Error; err != nil {
			response.InternalError(c, "Failed to get fixture groups")
			return
		}
		for _, g := range found {
			existing[g.Id] = g
		}
	}

	// Members sent in the request must be patched fixtures of this event.
	eventFixtures := map[string]bool{}
	if len(fixtureIds) > 0 {
		var found []string
		if err := database.DB().Model(&modelsv2.PatchedFixture{}).
			Where("event_id = ? AND id IN ?", eventId, fixtureIds).
			Pluck("id", &found).Error; err != nil {
			response.InternalError(c, "Failed to get fixtures")
			return
		}
		for _, id := range found {
			eventFixtures[id] = true
		}
	}

	rows, errs := buildGroups(req.FixtureGroups, eventId, existing, eventFixtures)
	if len(errs) > 0 {
		response.BadRequest(c, "Invalid fixture groups", map[string]any{"errors": errs})
		return
	}

	err := database.DB().Transaction(func(tx *gorm.DB) error {
		for i := range rows {
			row := &rows[i]
			if req.FixtureGroups[i].Id == nil {
				if err := tx.Create(row).Error; err != nil {
					return err
				}
				continue
			}
			// Select lists every editable column so zero values (sortOrder 0, grid null) are written too.
			if err := tx.Model(row).
				Select("Name", "Description", "FixtureIds", "Grid", "SortOrder").
				Updates(row).Error; err != nil {
				return err
			}
			if err := tx.First(row, "id = ?", row.Id).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		response.InternalError(c, "Failed to save fixture groups")
		return
	}

	response.OK(c, map[string]any{
		"fixtureGroups": rows,
	})
}

// validateIds checks group and fixture ID formats without touching the database.
func validateIds(groups []modelsv2.UpsertFixtureGroupReq) []rowError {
	var errs []rowError
	seen := map[string]bool{}
	for i, g := range groups {
		if g.Id != nil {
			if _, err := uuid.Parse(*g.Id); err != nil {
				errs = append(errs, rowError{i, "invalid id"})
				continue
			}
			if seen[*g.Id] {
				errs = append(errs, rowError{i, "duplicate id"})
				continue
			}
			seen[*g.Id] = true
		}
		for _, id := range g.FixtureIds {
			if _, err := uuid.Parse(id); err != nil {
				errs = append(errs, rowError{i, fmt.Sprintf("invalid fixture id %q", id)})
				break
			}
		}
	}
	return errs
}

// collectIds returns the group IDs being updated and every fixture ID sent.
func collectIds(groups []modelsv2.UpsertFixtureGroupReq) (groupIds []string, fixtureIds []string) {
	seen := map[string]bool{}
	for _, g := range groups {
		if g.Id != nil {
			groupIds = append(groupIds, *g.Id)
		}
		for _, id := range g.FixtureIds {
			if !seen[id] {
				seen[id] = true
				fixtureIds = append(fixtureIds, id)
			}
		}
	}
	return groupIds, fixtureIds
}

// buildGroups applies each request entry onto its existing row (or a new one)
// and checks the result. existing holds this event's groups by ID;
// eventFixtures holds this event's patched fixture IDs.
func buildGroups(
	groups []modelsv2.UpsertFixtureGroupReq,
	eventId string,
	existing map[string]modelsv2.FixtureGroup,
	eventFixtures map[string]bool,
) ([]modelsv2.FixtureGroup, []rowError) {
	rows := make([]modelsv2.FixtureGroup, len(groups))
	var errs []rowError

	for i, g := range groups {
		row := modelsv2.FixtureGroup{EventId: eventId, FixtureIds: datatypes.JSONSlice[string]{}}
		if g.Id != nil {
			found, ok := existing[*g.Id]
			if !ok {
				errs = append(errs, rowError{i, "fixture group not found in this event"})
				continue
			}
			row = found
		}

		if g.Name != nil {
			row.Name = strings.TrimSpace(*g.Name)
		}
		if row.Name == "" {
			errs = append(errs, rowError{i, "name is required"})
			continue
		}
		if g.Description != nil {
			row.Description = *g.Description
		}
		if g.SortOrder != nil {
			row.SortOrder = *g.SortOrder
		}

		if g.FixtureIds != nil {
			ids, msg := memberIds(g.FixtureIds, eventFixtures)
			if msg != "" {
				errs = append(errs, rowError{i, msg})
				continue
			}
			row.FixtureIds = ids
		}

		if g.Grid != nil {
			row.Grid = g.Grid
			if string(g.Grid) == "null" {
				row.Grid = nil
			}
		}

		rows[i] = row
	}
	return rows, errs
}

// memberIds drops duplicates and checks every ID is a fixture of the event.
func memberIds(ids []string, eventFixtures map[string]bool) (datatypes.JSONSlice[string], string) {
	out := datatypes.JSONSlice[string]{}
	seen := map[string]bool{}
	for _, id := range ids {
		if seen[id] {
			continue
		}
		seen[id] = true
		if !eventFixtures[id] {
			return nil, fmt.Sprintf("fixture %q is not in this event", id)
		}
		out = append(out, id)
	}
	return out, ""
}

// getFixtureGroups lists the event's fixture groups in cue card order.
func getFixtureGroups(c *gin.Context) {
	eventId := eventscope.EventId(c)

	fixtureGroups := []modelsv2.FixtureGroup{}
	if err := database.DB().
		Where("event_id = ?", eventId).
		Order("sort_order ASC").
		Order("created_at ASC").
		Find(&fixtureGroups).Error; err != nil {
		response.InternalError(c, "Failed to get fixture groups")
		return
	}

	response.OK(c, map[string]any{
		"fixtureGroups": fixtureGroups,
	})
}

func deleteFixtureGroup(c *gin.Context) {
	eventId := eventscope.EventId(c)
	groupId := c.Param("fixtureGroupId")

	if err := database.DB().Where("event_id = ? AND id = ?", eventId, groupId).Delete(&modelsv2.FixtureGroup{}).Error; err != nil {
		response.InternalError(c, "Failed to delete fixture group")
		return
	}

	response.OK(c, map[string]any{
		"deleted": true,
	})
}
