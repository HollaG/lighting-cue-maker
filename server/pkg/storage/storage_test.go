package storage

import (
	"bytes"
	"context"
	"io"
	"mime"
	"net"
	"net/http"
	"testing"
	"time"
)

// Azurite's built-in dev account (public, well-known key).
const azuriteConnectionString = "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;" +
	"AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;" +
	"BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"

// TestStoreAgainstAzurite uploads, reads through a SAS URL, and deletes a blob.
// Skipped unless Azurite is running locally (docker compose up -d azurite).
func TestStoreAgainstAzurite(t *testing.T) {
	conn, err := net.DialTimeout("tcp", "127.0.0.1:10000", 300*time.Millisecond)
	if err != nil {
		t.Skip("Azurite not running on 127.0.0.1:10000")
	}
	conn.Close()

	ctx := context.Background()
	store, err := New(ctx, azuriteConnectionString, "storage-test")
	if err != nil {
		t.Fatal(err)
	}
	// Creating again must not fail (container already exists).
	if _, err := New(ctx, azuriteConnectionString, "storage-test"); err != nil {
		t.Fatalf("second New: %v", err)
	}

	key := "tests/" + time.Now().Format("20060102150405.000000000") + ".mp3"
	content := bytes.Repeat([]byte("audio"), 300_000) // 1.5 MB: more than one block
	if err := store.Upload(ctx, key, bytes.NewReader(content), "audio/mpeg", "Ballade für Anna.mp3"); err != nil {
		t.Fatal(err)
	}

	url, expiresAt, err := store.ReadURL(key)
	if err != nil {
		t.Fatal(err)
	}
	if until := time.Until(expiresAt); until < time.Hour-time.Minute || until > 2*time.Hour {
		t.Errorf("expiry in %v, want between 1 and 2 hours", until)
	}
	if again, _, _ := store.ReadURL(key); again != url && time.Now().Minute() != 59 {
		t.Errorf("URL changed within the same hour:\n%s\n%s", url, again)
	}

	resp, err := http.Get(url)
	if err != nil {
		t.Fatal(err)
	}
	got, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK || !bytes.Equal(got, content) {
		t.Fatalf("GET via SAS: status %d, %d bytes (want 200, %d bytes)", resp.StatusCode, len(got), len(content))
	}
	if ct := resp.Header.Get("Content-Type"); ct != "audio/mpeg" {
		t.Errorf("Content-Type = %q, want audio/mpeg", ct)
	}
	if cc := resp.Header.Get("Cache-Control"); cc != cacheControl {
		t.Errorf("Cache-Control = %q, want %q", cc, cacheControl)
	}
	// The browser's "Save as" name, non-ASCII included.
	disposition, params, err := mime.ParseMediaType(resp.Header.Get("Content-Disposition"))
	if err != nil || disposition != "inline" || params["filename"] != "Ballade für Anna.mp3" {
		t.Errorf("Content-Disposition = %q (parsed %q %v, err %v), want inline with the original name",
			resp.Header.Get("Content-Disposition"), disposition, params, err)
	}

	if err := store.Delete(ctx, key); err != nil {
		t.Fatal(err)
	}
	if err := store.Delete(ctx, key); err != nil {
		t.Fatalf("deleting a missing blob should succeed: %v", err)
	}
}
