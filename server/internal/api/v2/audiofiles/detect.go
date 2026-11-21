package audiofiles

import (
	"bytes"
	"mime"
	"path"
	"strings"
	"unicode/utf8"
)

// sniffLen is how many bytes detectAudioType needs from the start of the file.
const sniffLen = 12

// detectAudioType returns the MIME type for an allowed audio format, judged by the
// file's first bytes (not its name or the browser's Content-Type).
// Allowed: MP3, AAC (ADTS), M4A/MP4 audio, OGG (Vorbis/Opus), WAV, FLAC.
func detectAudioType(head []byte) (string, bool) {
	switch {
	case bytes.HasPrefix(head, []byte("ID3")):
		return "audio/mpeg", true // MP3 with an ID3 tag
	case len(head) >= 2 && head[0] == 0xFF && head[1]&0xE0 == 0xE0:
		// MPEG audio frame sync. Layer bits 00 = AAC in ADTS, otherwise MP3.
		if head[1]&0x06 == 0 {
			return "audio/aac", true
		}
		return "audio/mpeg", true
	case len(head) >= 12 && bytes.Equal(head[0:4], []byte("RIFF")) && bytes.Equal(head[8:12], []byte("WAVE")):
		return "audio/wav", true
	case bytes.HasPrefix(head, []byte("OggS")):
		return "audio/ogg", true
	case bytes.HasPrefix(head, []byte("fLaC")):
		return "audio/flac", true
	case len(head) >= 8 && bytes.Equal(head[4:8], []byte("ftyp")):
		// ISO media (M4A, also MP4 video: the browser plays its audio track).
		return "audio/mp4", true
	}
	return "", false
}

// fallbackMimeType is the type for a file detectAudioType doesn't recognise: the
// browser's audio/* or video/* type if it sent one, else a generic binary type.
func fallbackMimeType(contentType string) string {
	mediaType, _, err := mime.ParseMediaType(contentType)
	if err == nil && (strings.HasPrefix(mediaType, "audio/") || strings.HasPrefix(mediaType, "video/")) {
		return mediaType
	}
	return "application/octet-stream"
}

// extensionFor is the file extension for a type detectAudioType returns, so a
// downloaded blob opens with the right app.
func extensionFor(mimeType string) string {
	switch mimeType {
	case "audio/mpeg":
		return ".mp3"
	case "audio/aac":
		return ".aac"
	case "audio/wav":
		return ".wav"
	case "audio/ogg":
		return ".ogg"
	case "audio/flac":
		return ".flac"
	case "audio/mp4":
		return ".m4a"
	}
	return ""
}

// maxFileNameRunes caps the stored file name.
const maxFileNameRunes = 200

// cleanFileName keeps only the base name the browser sent (no folders), trimmed
// and capped. Falls back to "audio" if nothing is left.
func cleanFileName(name string) string {
	name = strings.ReplaceAll(name, `\`, "/") // Windows paths
	name = strings.TrimSpace(path.Base(name))
	if !utf8.ValidString(name) {
		name = strings.ToValidUTF8(name, "")
	}
	if name == "." || name == "/" || name == "" {
		return "audio"
	}
	if runes := []rune(name); len(runes) > maxFileNameRunes {
		name = string(runes[:maxFileNameRunes])
	}
	return name
}
