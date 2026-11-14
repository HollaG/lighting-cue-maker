package timelines

import (
	"errors"
	"fmt"
	"net/http"

	modelsv2 "lighting-cue-maker/server/internal/models/v2"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// getTimeline returns the item's main timeline, or null if it has none yet
// (timeline mode never used, or nothing saved yet). Clips only hold an
// audioFileId: playback URLs come from GET …/audio-files.
func getTimeline(c *gin.Context) {
	itemId := c.Param("itemId")

	var timeline modelsv2.Timeline
	err := database.DB().Where("item_id = ?", itemId).First(&timeline).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		response.OK(c, map[string]any{"timeline": nil})
		return
	}
	if err != nil {
		response.InternalError(c, "Failed to get timeline")
		return
	}

	timeline.Normalize()
	response.OK(c, map[string]any{"timeline": timeline})
}

// requestError is returned from inside a transaction to roll it back and send
// this status and message.
type requestError struct {
	status  int
	message string
}

func (e *requestError) Error() string { return e.message }

func badRequest(format string, args ...any) error {
	return &requestError{http.StatusBadRequest, fmt.Sprintf(format, args...)}
}

func internalError(message string) error {
	return &requestError{http.StatusInternalServerError, message}
}

// upsertTimeline creates the item's main timeline if it has none, otherwise
// updates it. Fields left out keep their value; sections and audios are
// replaced as a whole. The whole result is validated before saving.
func upsertTimeline(c *gin.Context) {
	itemId := c.Param("itemId")

	var req modelsv2.UpsertTimelineReqBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}
	in := req.Timeline

	var saved modelsv2.Timeline
	err := database.DB().Transaction(func(tx *gorm.DB) error {
		// Lock the row so a concurrent save (or a cue delete removing markers) waits for this one.
		var row modelsv2.Timeline
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("item_id = ?", itemId).First(&row).Error
		isNew := errors.Is(err, gorm.ErrRecordNotFound)
		if err != nil && !isNew {
			return internalError("Failed to get timeline")
		}
		if isNew {
			// snapEnabled defaults to true when the request leaves it out.
			row = modelsv2.Timeline{ItemId: itemId, TimelineFields: modelsv2.TimelineFields{SnapEnabled: true}}
		}

		if in.Sections != nil {
			row.Sections = *in.Sections
		}
		if in.Audios != nil {
			row.Audios = *in.Audios
		}
		if in.SnapEnabled != nil {
			row.SnapEnabled = *in.SnapEnabled
		}
		row.Normalize()

		if err := modelsv2.ValidateTimeline(row.Sections, row.Audios); err != nil {
			return badRequest("%s", err.Error())
		}
		if err := checkReferences(tx, itemId, row.TimelineFields); err != nil {
			return err
		}

		if isNew {
			if err := tx.Create(&row).Error; err != nil {
				// Most likely another request created it at the same moment (unique item_id).
				return internalError("Failed to create timeline, try again")
			}
		} else {
			// Select lists every editable column so empty lists and false are written too.
			if err := tx.Model(&row).Select("Sections", "Audios", "SnapEnabled").Updates(&row).Error; err != nil {
				return internalError("Failed to save timeline")
			}
		}

		if err := tx.First(&saved, "id = ?", row.Id).Error; err != nil {
			return internalError("Failed to get timeline")
		}
		return nil
	})

	var reqErr *requestError
	if errors.As(err, &reqErr) {
		if reqErr.status == http.StatusBadRequest {
			response.BadRequest(c, reqErr.message, nil)
		} else {
			response.InternalError(c, reqErr.message)
		}
		return
	}
	if err != nil {
		response.InternalError(c, "Failed to save timeline")
		return
	}

	saved.Normalize()
	response.OK(c, map[string]any{
		"timeline": saved,
	})
}

// checkReferences checks the ids inside the timeline against the database:
//   - every cueId is a (not deleted) main cue of this item,
//   - every alternateCueId is an alternate of its marker's cueId,
//   - every audio clip's file is READY, was uploaded for this item, and
//     offset + duration fits inside the file.
func checkReferences(tx *gorm.DB, itemId string, fields modelsv2.TimelineFields) error {
	cueIds := []string{}
	alternateIds := []string{}
	for _, s := range fields.Sections {
		for _, m := range s.Markers {
			if m.CueId != nil {
				if _, err := uuid.Parse(*m.CueId); err != nil {
					return badRequest("marker %q: invalid cueId %q", m.Id, *m.CueId)
				}
				cueIds = append(cueIds, *m.CueId)
			}
			if m.AlternateCueId != nil {
				if _, err := uuid.Parse(*m.AlternateCueId); err != nil {
					return badRequest("marker %q: invalid alternateCueId %q", m.Id, *m.AlternateCueId)
				}
				alternateIds = append(alternateIds, *m.AlternateCueId)
			}
		}
	}
	audioFileIds := []string{}
	for _, a := range fields.Audios {
		if _, err := uuid.Parse(a.AudioFileId); err != nil {
			return badRequest("audio %q: invalid audioFileId %q", a.Id, a.AudioFileId)
		}
		audioFileIds = append(audioFileIds, a.AudioFileId)
	}

	if len(cueIds) > 0 {
		var found []string
		if err := tx.Model(&modelsv2.Cue{}).
			Where("item_id = ? AND id IN ?", itemId, cueIds).
			Pluck("id", &found).Error; err != nil {
			return internalError("Failed to check cues")
		}
		ok := toSet(found)
		for _, s := range fields.Sections {
			for _, m := range s.Markers {
				if m.CueId != nil && !ok[*m.CueId] {
					return badRequest("marker %q: cue %q is not a cue of this item", m.Id, *m.CueId)
				}
			}
		}
	}

	if len(alternateIds) > 0 {
		var rows []struct {
			Id    string
			CueId string
		}
		if err := tx.Model(&modelsv2.AlternateCue{}).
			Select("id", "cue_id").
			Where("id IN ?", alternateIds).
			Find(&rows).Error; err != nil {
			return internalError("Failed to check alternate cues")
		}
		parentOf := map[string]string{}
		for _, r := range rows {
			parentOf[r.Id] = r.CueId
		}
		for _, s := range fields.Sections {
			for _, m := range s.Markers {
				if m.AlternateCueId == nil {
					continue
				}
				// The main cue was checked above, so a matching parent also means it's in this item.
				if parent, ok := parentOf[*m.AlternateCueId]; !ok || m.CueId == nil || parent != *m.CueId {
					return badRequest("marker %q: alternate cue %q is not an alternate of its cue", m.Id, *m.AlternateCueId)
				}
			}
		}
	}

	if len(audioFileIds) > 0 {
		var rows []struct {
			Id         string
			DurationMs int
		}
		if err := tx.Model(&modelsv2.AudioFile{}).
			Select("id", "duration_ms").
			Where("id IN ? AND uploader_item_id = ? AND status = ?", audioFileIds, itemId, modelsv2.FileStatusReady).
			Find(&rows).Error; err != nil {
			return internalError("Failed to check audio files")
		}
		durationOf := map[string]int{}
		for _, r := range rows {
			durationOf[r.Id] = r.DurationMs
		}
		for _, a := range fields.Audios {
			duration, ok := durationOf[a.AudioFileId]
			if !ok {
				return badRequest("audio %q: file %q is not a ready audio file of this item", a.Id, a.AudioFileId)
			}
			if a.Offset+a.Duration > duration {
				return badRequest("audio %q: offset %d + duration %d ms is past the end of its file (%d ms)",
					a.Id, a.Offset, a.Duration, duration)
			}
		}
	}
	return nil
}

func toSet(ids []string) map[string]bool {
	set := make(map[string]bool, len(ids))
	for _, id := range ids {
		set[id] = true
	}
	return set
}

// RemoveCueMarkers deletes the cue's markers from the item's main timeline and
// its alternates. Call it inside the transaction that deletes the cue.
func RemoveCueMarkers(tx *gorm.DB, itemId string, cueId string) error {
	var main modelsv2.Timeline
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("item_id = ?", itemId).First(&main).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil // no timeline, nothing to clean up
	}
	if err != nil {
		return err
	}
	main.Normalize()
	if main.RemoveCueMarkers(cueId) {
		if err := tx.Model(&main).Select("Sections").Updates(&main).Error; err != nil {
			return err
		}
	}

	var alternates []modelsv2.AlternateTimeline
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("timeline_id = ?", main.Id).
		Find(&alternates).Error; err != nil {
		return err
	}
	for i := range alternates {
		alternates[i].Normalize()
		if alternates[i].RemoveCueMarkers(cueId) {
			if err := tx.Model(&alternates[i]).Select("Sections").Updates(&alternates[i]).Error; err != nil {
				return err
			}
		}
	}
	return nil
}
