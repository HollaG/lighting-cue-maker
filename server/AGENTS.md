# Server contributor guidance

Keep changes small and consistent with the existing Gin/GORM structure.

## HTTP responses

- Always return HTTP responses through `pkg/response/response.go`.
- Do not call `c.JSON`, `c.String`, or similar Gin response methods directly in handlers.
- If a required HTTP status or response shape is missing, add a focused helper to the `response` package and use it.
- Preserve the shared response envelope (`success`, `data`, `error`, and `message`) so clients receive a consistent shape.
- Use the helper matching the outcome: `Created` for successful creates, `OK` for other successful requests, `BadRequest` for invalid client input, `NotFound` for missing resources, and `InternalError` for unexpected server failures.
- Return immediately after sending an error response so the handler cannot continue or write a second response.
- Keep client-facing errors concise and do not expose database errors or internal implementation details.

## Handlers and models

- Put versioned handlers under `internal/api/v1/<resource>/handler.go` and route registration in the adjacent `routes.go`.
- Define request DTOs and database models in `internal/models`; keep JSON field names camelCase to match the frontend API types.
- Bind JSON with `ShouldBindJSON`, handle binding failures, and validate required or domain-specific values before database writes.
- Use path parameters for the identity of an existing resource. Avoid adding multiple aliases for the same parameter unless backward compatibility requires them.
- Use a database transaction when one request changes multiple related records that must succeed or fail together.
- Check database errors and map them to the appropriate response helper. Do not silently ignore failures.

## General

- Prefer straightforward code over new abstractions for one-off behavior.
- Comment non-obvious business logic and transaction reconciliation code; avoid comments that merely repeat the code.
- Run `gofmt` on changed Go files and `go test ./...` before finishing.
