package audiofiles

import "testing"

func TestDetectAudioType(t *testing.T) {
	tests := []struct {
		name string
		head []byte
		want string // "" = rejected
	}{
		{"mp3 with ID3 tag", []byte("ID3\x04\x00\x00\x00\x00\x00\x00\x00\x00"), "audio/mpeg"},
		{"mp3 frame sync", []byte{0xFF, 0xFB, 0x90, 0x64}, "audio/mpeg"},
		{"aac adts", []byte{0xFF, 0xF1, 0x50, 0x80}, "audio/aac"},
		{"wav", []byte("RIFF\x24\x08\x00\x00WAVE"), "audio/wav"},
		{"ogg", []byte("OggS\x00\x02\x00\x00"), "audio/ogg"},
		{"flac", []byte("fLaC\x00\x00\x00\x22"), "audio/flac"},
		{"m4a", []byte("\x00\x00\x00\x20ftypM4A "), "audio/mp4"},
		{"riff but not wave (avi)", []byte("RIFF\x24\x08\x00\x00AVI "), ""},
		{"png", []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\x0d"), ""},
		{"text", []byte("hello world!"), ""},
		{"empty", nil, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := detectAudioType(tt.head)
			if got != tt.want || ok != (tt.want != "") {
				t.Fatalf("detectAudioType = %q, %v; want %q", got, ok, tt.want)
			}
		})
	}
}

func TestEveryDetectedTypeHasAnExtension(t *testing.T) {
	for _, mimeType := range []string{"audio/mpeg", "audio/aac", "audio/wav", "audio/ogg", "audio/flac", "audio/mp4"} {
		if extensionFor(mimeType) == "" {
			t.Errorf("no extension for %q", mimeType)
		}
	}
	if got := blobKey("e", "i", "f", ".mp3"); got != "events/e/items/i/audio/f.mp3" {
		t.Errorf("blobKey = %q", got)
	}
}

func TestCleanFileName(t *testing.T) {
	tests := map[string]string{
		"song.mp3":                    "song.mp3",
		"  song.mp3  ":                "song.mp3",
		"C:\\Users\\me\\Music\\a.mp3": "a.mp3",
		"../../etc/passwd":            "passwd",
		"":                            "audio",
		"/":                           "audio",
		"folder/":                     "folder",
		"bad\xffname.mp3":             "badname.mp3",
	}
	for in, want := range tests {
		if got := cleanFileName(in); got != want {
			t.Errorf("cleanFileName(%q) = %q, want %q", in, got, want)
		}
	}

	long := make([]rune, 300)
	for i := range long {
		long[i] = 'é'
	}
	if got := []rune(cleanFileName(string(long))); len(got) != maxFileNameRunes {
		t.Errorf("long name: %d runes, want %d", len(got), maxFileNameRunes)
	}
}
