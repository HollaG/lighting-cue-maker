package optionsets

import (
	"encoding/json"
	"errors"
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

// rowError points at one entry of the request's optionSets array.
type rowError struct {
	Index int    `json:"index"`
	Error string `json:"error"`
}

// requireFixtureGroup stops the request unless :fixtureGroupId is a fixture
// group of the event in the URL.
func requireFixtureGroup(c *gin.Context) {
	eventId := eventscope.EventId(c)
	groupId := c.Param("fixtureGroupId")

	if _, err := uuid.Parse(groupId); err != nil {
		response.BadRequest(c, "Invalid fixture group id", nil)
		c.Abort()
		return
	}

	var count int64
	if err := database.DB().Model(&modelsv2.FixtureGroup{}).
		Where("event_id = ? AND id = ?", eventId, groupId).
		Count(&count).Error; err != nil {
		response.InternalError(c, "Failed to get fixture group")
		c.Abort()
		return
	}
	if count == 0 {
		response.NotFound(c, "Fixture group not found in this event")
		c.Abort()
		return
	}
	c.Next()
}

// upsertOptionSets creates (no id) or updates (id) several option sets of the
// fixture group in one transaction. Option sets not in the request are left
// alone. The response lists the saved option sets in request order, so new IDs
// line up by index.
func upsertOptionSets(c *gin.Context) {
	groupId := c.Param("fixtureGroupId")

	var req modelsv2.UpsertOptionSetsReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	// Check ID formats first: Postgres errors on a non-UUID in "id IN ?".
	optionSetIds, errs := collectIds(req.OptionSets)
	if len(errs) > 0 {
		response.BadRequest(c, "Invalid option sets", map[string]any{"errors": errs})
		return
	}

	// Option sets being updated must belong to this group (and not be deleted).
	existing := map[string]modelsv2.OptionSet{}
	if len(optionSetIds) > 0 {
		var found []modelsv2.OptionSet
		if err := database.DB().Where("fixture_group_id = ? AND id IN ?", groupId, optionSetIds).Find(&found).Error; err != nil {
			response.InternalError(c, "Failed to get option sets")
			return
		}
		for _, o := range found {
			existing[o.Id] = o
		}
	}

	rows, errs := buildOptionSets(req.OptionSets, groupId, existing)
	if len(errs) > 0 {
		response.BadRequest(c, "Invalid option sets", map[string]any{"errors": errs})
		return
	}

	err := database.DB().Transaction(func(tx *gorm.DB) error {
		for i := range rows {
			row := &rows[i]
			if req.OptionSets[i].Id == nil {
				if err := tx.Create(row).Error; err != nil {
					return err
				}
				continue
			}
			// Select lists every editable column so zero values (sortOrder 0, required false) are written too.
			if err := tx.Model(row).
				Select("Name", "Description", "SortOrder", "Priority", "SelectionType", "Type",
					"Selectables", "DefaultSelectableIds", "Required").
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
		response.InternalError(c, "Failed to save option sets")
		return
	}

	response.OK(c, map[string]any{
		"optionSets": rows,
	})
}

// collectIds checks the ID format of each entry and returns the IDs being updated.
func collectIds(optionSets []modelsv2.UpsertOptionSetReq) ([]string, []rowError) {
	var ids []string
	var errs []rowError
	seen := map[string]bool{}
	for i, o := range optionSets {
		if o.Id == nil {
			continue
		}
		if _, err := uuid.Parse(*o.Id); err != nil {
			errs = append(errs, rowError{i, "invalid id"})
			continue
		}
		if seen[*o.Id] {
			errs = append(errs, rowError{i, "duplicate id"})
			continue
		}
		seen[*o.Id] = true
		ids = append(ids, *o.Id)
	}
	return ids, errs
}

// buildOptionSets applies each request entry onto its existing row (or a new
// one) and checks the result. existing holds this group's option sets by ID.
func buildOptionSets(
	optionSets []modelsv2.UpsertOptionSetReq,
	groupId string,
	existing map[string]modelsv2.OptionSet,
) ([]modelsv2.OptionSet, []rowError) {
	rows := make([]modelsv2.OptionSet, len(optionSets))
	var errs []rowError

	for i, o := range optionSets {
		row := modelsv2.OptionSet{
			FixtureGroupId:       groupId,
			Selectables:          datatypes.JSON(`[]`),
			DefaultSelectableIds: datatypes.JSONSlice[string]{},
		}
		if o.Id != nil {
			found, ok := existing[*o.Id]
			if !ok {
				errs = append(errs, rowError{i, "option set not found in this fixture group"})
				continue
			}
			row = found
		}

		if o.Name != nil {
			row.Name = strings.TrimSpace(*o.Name)
		}
		if o.Description != nil {
			row.Description = *o.Description
		}
		if o.SortOrder != nil {
			row.SortOrder = *o.SortOrder
		}
		if o.Priority != nil {
			row.Priority = *o.Priority
		}
		if o.SelectionType != nil {
			row.SelectionType = *o.SelectionType
		}
		if o.Type != nil {
			row.Type = *o.Type
		}
		if o.Selectables != nil {
			row.Selectables = o.Selectables
		}
		if o.DefaultSelectableIds != nil {
			row.DefaultSelectableIds = dedupe(o.DefaultSelectableIds)
		}
		if o.Required != nil {
			row.Required = *o.Required
		}

		if msg := validateOptionSet(row); msg != "" {
			errs = append(errs, rowError{i, msg})
			continue
		}
		rows[i] = row
	}
	return rows, errs
}

// validateOptionSet checks the finished row without touching the database.
func validateOptionSet(row modelsv2.OptionSet) string {
	if row.Name == "" {
		return "name is required"
	}
	switch row.SelectionType {
	case modelsv2.OptionSetSelectionSingle, modelsv2.OptionSetSelectionMulti, modelsv2.OptionSetSelectionBool:
	default:
		return fmt.Sprintf("invalid selectionType %q", row.SelectionType)
	}
	switch row.Type {
	case modelsv2.OptionSetTypeIntensity, modelsv2.OptionSetTypeColour, modelsv2.OptionSetTypePosition, modelsv2.OptionSetTypeCustom:
	default:
		return fmt.Sprintf("invalid type %q", row.Type)
	}

	ids, msg := selectableIds(row.Selectables)
	if msg != "" {
		return msg
	}
	for _, id := range row.DefaultSelectableIds {
		if !ids[id] {
			return fmt.Sprintf("default selectable %q is not in selectables", id)
		}
	}
	if row.SelectionType == modelsv2.OptionSetSelectionSingle && len(row.DefaultSelectableIds) > 1 {
		return "a SINGLE option set can have at most one default"
	}
	return ""
}

// selectableIds reads the IDs of a Selectable[] (each needs a unique string id).
func selectableIds(selectables datatypes.JSON) (map[string]bool, string) {
	var items []struct {
		Id string `json:"id"`
	}
	if err := json.Unmarshal(selectables, &items); err != nil || items == nil {
		return nil, "selectables must be a JSON array"
	}

	ids := map[string]bool{}
	for _, s := range items {
		if s.Id == "" {
			return nil, "every selectable needs an id"
		}
		if ids[s.Id] {
			return nil, fmt.Sprintf("duplicate selectable id %q", s.Id)
		}
		ids[s.Id] = true
	}
	return ids, ""
}

func dedupe(ids []string) datatypes.JSONSlice[string] {
	out := datatypes.JSONSlice[string]{}
	seen := map[string]bool{}
	for _, id := range ids {
		if !seen[id] {
			seen[id] = true
			out = append(out, id)
		}
	}
	return out
}

// getOptionSets lists the fixture group's option sets in the order they appear.
func getOptionSets(c *gin.Context) {
	groupId := c.Param("fixtureGroupId")

	optionSets := []modelsv2.OptionSet{}
	if err := database.DB().
		Where("fixture_group_id = ?", groupId).
		Order("sort_order ASC").
		// Order("created_at DESC").
		Find(&optionSets).Error; err != nil {
		response.InternalError(c, "Failed to get option sets")
		return
	}

	response.OK(c, map[string]any{
		"optionSets": optionSets,
	})
}

func getOptionSet(c *gin.Context) {
	groupId := c.Param("fixtureGroupId")
	optionSetId := c.Param("optionSetId")

	if _, err := uuid.Parse(optionSetId); err != nil {
		response.BadRequest(c, "Invalid option set id", nil)
		return
	}

	var optionSet modelsv2.OptionSet
	if err := database.DB().Where("fixture_group_id = ? AND id = ?", groupId, optionSetId).First(&optionSet).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.NotFound(c, "Option set not found in this fixture group")
			return
		}
		response.InternalError(c, "Failed to get option set")
		return
	}

	response.OK(c, map[string]any{
		"optionSet": optionSet,
	})
}

// deleteOptionSet soft-deletes the option set. Cues keep their references to
// it, so restoring it brings them back (see "Safe setup edits").
func deleteOptionSet(c *gin.Context) {
	groupId := c.Param("fixtureGroupId")
	optionSetId := c.Param("optionSetId")

	if _, err := uuid.Parse(optionSetId); err != nil {
		response.BadRequest(c, "Invalid option set id", nil)
		return
	}

	result := database.DB().Where("fixture_group_id = ? AND id = ?", groupId, optionSetId).Delete(&modelsv2.OptionSet{})
	if result.Error != nil {
		response.InternalError(c, "Failed to delete option set")
		return
	}
	if result.RowsAffected == 0 {
		response.NotFound(c, "Option set not found in this fixture group")
		return
	}

	response.OK(c, map[string]any{
		"deleted": true,
	})
}
