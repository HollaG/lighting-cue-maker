// Package storage keeps files in Azure Blob Storage (Azurite in dev).
//
// Blobs are addressed by a key (the blob name, e.g. "events/{eventId}/items/{itemId}/audio/{id}").
// The account and container come from config, so keys stay valid if storage moves.
// The container is private: browsers only get short-lived read-only SAS URLs.
package storage

import (
	"context"
	"fmt"
	"io"
	"mime"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/blob"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/bloberror"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/blockblob"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/container"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/sas"
)

// Browsers may cache a blob this long. Each blob's content never changes (new upload = new key).
const cacheControl = "private, max-age=86400, immutable"

// Store is one container.
type Store struct {
	container *container.Client
}

// New connects to the container and creates it if it doesn't exist yet.
// The connection string must contain an account key (needed to sign SAS URLs).
func New(ctx context.Context, connectionString, containerName string) (*Store, error) {
	client, err := container.NewClientFromConnectionString(connectionString, containerName, nil)
	if err != nil {
		return nil, fmt.Errorf("storage: connect: %w", err)
	}
	// No access option = private container.
	if _, err := client.Create(ctx, nil); err != nil && !bloberror.HasCode(err, bloberror.ContainerAlreadyExists) {
		return nil, fmt.Errorf("storage: create container %q: %w", containerName, err)
	}
	return &Store{container: client}, nil
}

// Upload streams body into the blob `key`, replacing any blob with that key.
// The body is sent in blocks, so it's never held in memory as a whole.
//
// downloadName is the name a browser offers when the blob's link is saved
// (Content-Disposition). "inline" keeps the link playable in the browser.
// Empty = no Content-Disposition (the browser uses the key's last part).
func (s *Store) Upload(ctx context.Context, key string, body io.Reader, contentType, downloadName string) error {
	headers := &blob.HTTPHeaders{BlobContentType: &contentType, BlobCacheControl: to.Ptr(cacheControl)}
	if downloadName != "" {
		// FormatMediaType quotes the name and encodes non-ASCII (RFC 2231 filename*=).
		if disposition := mime.FormatMediaType("inline", map[string]string{"filename": downloadName}); disposition != "" {
			headers.BlobContentDisposition = &disposition
		}
	}
	_, err := s.container.NewBlockBlobClient(key).UploadStream(ctx, body, &blockblob.UploadStreamOptions{
		BlockSize:   4 * 1024 * 1024, // each block is one write operation; 50 MB ≈ 13 writes
		Concurrency: 2,               // buffers in memory per upload = BlockSize × Concurrency
		HTTPHeaders: headers,
	})
	if err != nil {
		return fmt.Errorf("storage: upload %q: %w", key, err)
	}
	return nil
}

// Delete removes the blob. A blob that doesn't exist counts as deleted.
func (s *Store) Delete(ctx context.Context, key string) error {
	_, err := s.container.NewBlobClient(key).Delete(ctx, nil)
	if err != nil && !bloberror.HasCode(err, bloberror.BlobNotFound) {
		return fmt.Errorf("storage: delete %q: %w", key, err)
	}
	return nil
}

// ReadURL returns a read-only SAS URL for the blob and when it expires.
//
// The expiry is rounded to the hour, so within the same hour the URL for a blob is identical
// and the browser can reuse its cached copy (a different URL = a new download). Every URL is
// valid for at least 1 hour (between 1 and 2 hours).
func (s *Store) ReadURL(key string) (string, time.Time, error) {
	expiry := time.Now().UTC().Truncate(time.Hour).Add(2 * time.Hour)
	url, err := s.container.NewBlobClient(key).GetSASURL(sas.BlobPermissions{Read: true}, expiry, nil)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("storage: sign %q: %w", key, err)
	}
	return url, expiry, nil
}
