package v2

import "time"

// FileStatus is an upload's state.
type FileStatus string

const (
	// Row created and an upload URL handed out; the blob may not exist yet.
	FileStatusPending FileStatus = "PENDING"
	// Upload confirmed (blob exists, size checked).
	FileStatusReady FileStatus = "READY"
)

// AudioFile is one uploaded audio blob in Azure Blob Storage.
//
// Deleting an item soft-deletes its audio files; a cleanup job later deletes
// the blob and the row (also for uploads left PENDING).
type AudioFile struct {
	Base

	// The item it was uploaded for; its files are deleted with it.
	UploaderItemId string `json:"uploaderItemId" gorm:"type:uuid;not null;index"`
	// NOT a relation: stored for later analysis.
	EventId string `json:"eventId" gorm:"type:uuid;not null;index"`

	// Blob name (path inside the container), e.g. events/{eventId}/items/{itemId}/audio/{id}.
	// The account and container come from config. Never sent to the browser: it gets SAS URLs.
	BlobKey string `json:"-" gorm:"type:text;not null;uniqueIndex"`

	FileName string `json:"fileName" gorm:"type:text;not null"`
	MimeType string `json:"mimeType" gorm:"type:text;not null"`

	SizeBytes  int64 `json:"sizeBytes" gorm:"not null"`
	DurationMs int   `json:"durationMs" gorm:"not null;default:0"` // 0 until the upload is confirmed

	Status FileStatus `json:"status" gorm:"type:text;not null;default:'PENDING';index"`
}

func (AudioFile) TableName() string { return "v2.audio_files" }

// AudioFileWithUrl is an AudioFile plus a read-only link to play it. The JSON is
// flat: the AudioFile's fields, then url and urlExpiresAt.
type AudioFileWithUrl struct {
	AudioFile
	Url          string    `json:"url"`          // usable directly as <audio src>
	UrlExpiresAt time.Time `json:"urlExpiresAt"` // refetch before this
}
