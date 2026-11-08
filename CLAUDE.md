# CueSketch

- `website/`: React + TypeScript frontend (Vite).
- `server/`: Go + GORM + Postgres API.

## v2 rewrite

- Before working on anything v2 (fixtures, fixture groups, option sets, selectables, cues, export), read [website/docs/v2-implementation-notes.md](website/docs/v2-implementation-notes.md).
- The v2 data structures are designed by the user in draw.io ("version 2" page). Follow the user's design; don't invent structure. `website/src/types/v2.ts` is an AI-generated reference only, not the source of truth.
