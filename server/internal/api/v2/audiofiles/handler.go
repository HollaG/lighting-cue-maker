package audiofiles

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"
	"time"

	"lighting-cue-maker/server/internal/api/v2/eventscope"
	modelsv2 "lighting-cue-maker/server/internal/models/v2"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"
	"lighting-cue-maker/server/pkg/storage"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type handler struct {
	store  *storage.Store
	limits Limits
}

// Room for the multipart boundaries and the durationMs field on top of the file.
const multipartOverhead = 64 * 1024

// blobKey is where an audio file lives in the container, e.g.
// events/{eventId}/items/{itemId}/audio/{id}.mp3. The extension is only for
// downloads and storage browsers; the row's blob_key is what finds the file.
func blobKey(eventId, itemId, audioFileId, extension string) string {
	return fmt.Sprintf("events/%s/items/%s/audio/%s%s", eventId, itemId, audioFileId, extension)
}

// withUrl adds a read-only link to the file.
func (h *handler) withUrl(file modelsv2.AudioFile) (modelsv2.AudioFileWithUrl, error) {
	url, expiresAt, err := h.store.ReadURL(file.BlobKey)
	if err != nil {
		return modelsv2.AudioFileWithUrl{}, err
	}
	return modelsv2.AudioFileWithUrl{AudioFile: file, Url: url, UrlExpiresAt: expiresAt}, nil
}

// list returns the item's ready audio files, oldest first, each with a playback link.
func (h *handler) list(c *gin.Context) {
	if h.store == nil {
		response.Error(c, http.StatusServiceUnavailable, "Audio storage is not configured")
		return
	}
	itemId := c.Param("itemId")

	files := []modelsv2.AudioFile{}
	if err := database.DB().
		Where("uploader_item_id = ? AND status = ?", itemId, modelsv2.FileStatusReady).
		Order("created_at ASC").
		Find(&files).Error; err != nil {
		response.InternalError(c, "Failed to get audio files")
		return
	}

	out := make([]modelsv2.AudioFileWithUrl, 0, len(files))
	for _, f := range files {
		withUrl, err := h.withUrl(f)
		if err != nil {
			log.Printf("audiofiles: %v", err)
			response.InternalError(c, "Failed to create audio links")
			return
		}
		out = append(out, withUrl)
	}

	response.OK(c, map[string]any{
		"audioFiles": out,
	})
}

// countingReader counts the bytes read and remembers the read error (e.g. the
// body went over http.MaxBytesReader's limit).
type countingReader struct {
	r   io.Reader
	n   int64
	err error
}

func (cr *countingReader) Read(p []byte) (int, error) {
	n, err := cr.r.Read(p)
	cr.n += int64(n)
	if err != nil && err != io.EOF {
		cr.err = err
	}
	return n, err
}

// upload stores one audio file: multipart/form-data with `durationMs` first,
// then `file`. The file is streamed straight into storage (never held whole in
// memory); the row is only created once the blob is saved.
func (h *handler) upload(c *gin.Context) {
	if h.store == nil {
		response.Error(c, http.StatusServiceUnavailable, "Audio storage is not configured")
		return
	}
	eventId := eventscope.EventId(c)
	itemId := c.Param("itemId")

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, h.limits.MaxBytes+multipartOverhead)
	reader, err := c.Request.MultipartReader()
	if err != nil {
		response.BadRequest(c, "Expected multipart/form-data", nil)
		return
	}

	// Part 1: durationMs. It must come first: the reader can't go back after the file.
	durationMs, ok := h.readDuration(c, reader)
	if !ok {
		return
	}

	// Part 2: the file.
	part, err := reader.NextPart()
	if err != nil || part.FormName() != "file" {
		response.BadRequest(c, "Missing the file field (after durationMs)", nil)
		return
	}
	defer part.Close()

	buffered := bufio.NewReader(part)
	head, _ := buffered.Peek(sniffLen) // a shorter file just gives a shorter head
	mimeType, ok := detectAudioType(head)
	if !ok {
		response.Error(c, http.StatusUnsupportedMediaType, "Unsupported audio format. Use MP3, M4A/AAC, OGG/Opus, WAV or FLAC")
		return
	}

	id := uuid.NewString()
	key := blobKey(eventId, itemId, id, extensionFor(mimeType))
	fileName := cleanFileName(part.FileName())
	body := &countingReader{r: buffered}

	// Remove the blob if anything after the upload fails. A fresh context: the
	// request's may already be cancelled.
	discard := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if err := h.store.Delete(ctx, key); err != nil {
			log.Printf("audiofiles: cleanup failed, orphaned blob %q: %v", key, err)
		}
	}

	uploadErr := h.store.Upload(c.Request.Context(), key, body, mimeType, fileName)
	var tooBig *http.MaxBytesError
	switch {
	case errors.As(body.err, &tooBig) || body.n > h.limits.MaxBytes:
		discard()
		response.Error(c, http.StatusRequestEntityTooLarge,
			fmt.Sprintf("File is larger than %d MB", h.limits.MaxBytes/1024/1024))
		return
	case uploadErr != nil:
		log.Printf("audiofiles: %v", uploadErr)
		discard()
		response.InternalError(c, "Failed to store the audio file")
		return
	case body.n == 0:
		discard()
		response.BadRequest(c, "The file is empty", nil)
		return
	}

	row := modelsv2.AudioFile{
		Base:           modelsv2.Base{Id: id},
		UploaderItemId: itemId,
		EventId:        eventId,
		BlobKey:        key,
		FileName:       fileName,
		MimeType:       mimeType,
		SizeBytes:      body.n,
		DurationMs:     durationMs,
		Status:         modelsv2.FileStatusReady,
	}
	if err := database.DB().Create(&row).Error; err != nil {
		discard()
		response.InternalError(c, "Failed to save the audio file")
		return
	}

	withUrl, err := h.withUrl(row)
	if err != nil {
		// Saved fine; only the link failed. The list endpoint will give one.
		log.Printf("audiofiles: %v", err)
		response.InternalError(c, "Audio file saved, but creating its link failed")
		return
	}
	response.Created(c, map[string]any{
		"audioFile": withUrl,
	})
}

// readDuration reads and checks the durationMs part. On failure it has already
// sent the error response.
func (h *handler) readDuration(c *gin.Context, reader *multipart.Reader) (int, bool) {
	part, err := reader.NextPart()
	if err != nil || part.FormName() != "durationMs" {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			response.Error(c, http.StatusRequestEntityTooLarge, "Request is too large")
			return 0, false
		}
		response.BadRequest(c, "durationMs must be the first form field", nil)
		return 0, false
	}
	defer part.Close()

	raw, err := io.ReadAll(io.LimitReader(part, 32))
	if err != nil {
		response.BadRequest(c, "Could not read durationMs", nil)
		return 0, false
	}
	durationMs, err := strconv.Atoi(strings.TrimSpace(string(raw)))
	if err != nil || durationMs <= 0 {
		response.BadRequest(c, "durationMs must be a whole number of milliseconds above 0", nil)
		return 0, false
	}
	if durationMs > h.limits.MaxDurationMs {
		response.BadRequest(c, fmt.Sprintf("Audio is longer than %d minutes", h.limits.MaxDurationMs/60000), nil)
		return 0, false
	}
	return durationMs, true
}
