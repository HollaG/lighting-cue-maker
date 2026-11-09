# v2 implementation notes

## Open TODOs (draw.io design)

- [ ] **Existing cues when an option set is added.** Defaults are copied when a cue is created, so cues that already exist get nothing for a new set, and with `required = true` they become invalid. Decide how to handle this, e.g. fill the default into existing cues when the set is added, or show a warning on the affected cues.
- [ ] **Cue `selectableIds` (flat list):** when picking in a single-select set, the UI removes that set's other selectable from the list.
- [ ] **Movement `width`/`height`/`offsetX`/`offsetY` are `int`.** Change them to floats (0–1), or write down the range they use.
- [ ] **Item `order` (setlist order).** Deferred. Items have no order field yet; add one when Run mode or export needs a fixed setlist order.
- [ ] **Export mapping storage.** Nowhere in the diagram yet: selectable -> console function (path 1) and fixture links (path 2). Blocks export only.
- [ ] **Undefined types:** `CueTransition`, `CueMode`, `ChannelType`, `FixtureType`, `ConsoleType`, `PatternEffect`, `MovementEffect`, `BlendMode`, `ColourMode`.
- [ ] **Bumps:** not in v2. Dropped on purpose?

## Migration (v1 -> v2)

- **Backend: v1 stays live and untouched.** No changes to `server/internal/api/v1`, the v1 models in `server/internal/models`, the `/api/v1` routes, the v1 `AutoMigrate` list, or v1 realtime message formats. The backend can then be deployed at any time without breaking the deployed v1 frontend.
- v2 is new code alongside: handlers in `server/internal/api/v2/...` mounted at `/api/v2`, models in `server/internal/models/v2` with `TableName()` returning `"v2.<table>"`.
- **Database:** v1 tables stay in the `public` schema. No data migration, no deletion. v2 tables live in a `v2` Postgres schema (`CREATE SCHEMA IF NOT EXISTS v2`, then a separate `AutoMigrate` for v2 models).
- Table names are snake_case plural (`v2.cues`, `v2.option_sets`); Go/TS types singular.
- The diagram's `order` fields are `sort_order` / `sortOrder` in the DB and JSON (`order` is a reserved SQL word). The primary key column is `id` (renamed from `uuid`; `v2.Migrate` renames old columns on startup).
- Every v2 table has `createdAt`, `updatedAt`, `deletedAt`, even where the diagram omits them (use one shared embedded struct).
- v2 realtime gets its own message types/channel.
- **Frontend:** the v1 frontend is deployed manually, so v1 frontend code on this branch can be replaced or deleted freely. Reuse the shared parts (`Visualiser3D`, `realtime/`, `lib/api.ts`, input components). The frontend talks to `/api/v2` only.
- The resolver and the exporter run in the **frontend** (TypeScript), one implementation shared by preview and export. The backend stores and validates data.
- [v2-schema.dbml](v2-schema.dbml) is a dbdiagram.io rendering of the diagram's tables, for reference.

## API (`/api/v2`)

- Everything except the fixture library lives under `/events/{eventId}`. One middleware checks the event (and later auth) for all of it.
- Parent IDs come **from the path only**; any `eventId` / `fixtureGroupId` in a body is ignored. Handlers still check that path and body IDs belong to that event (`WHERE id = ? AND event_id = ?`).
- `GET` reads, `POST` writes, `DELETE` deletes (soft).
- Bulk `POST` = upsert: a row without `id` is created, a row with `id` is updated (it must belong to the event). Rows not in the request are left alone; removing goes through `DELETE`. One transaction per request.
- Responses use the shared envelope (`success`, `data`, `error`, `message`); `data` is what the table shows.
- Cues and items (user side) will get per-row endpoints instead of bulk, because many users edit them at once.

| Method | URL | Request | Response |
|---|---|---|---|
| GET | `/fixture-templates` | – | `{ fixtureTemplates: FixtureTemplate[] }` |
| GET | `/events` | – | `{ events: Event[] }` (no children) |
| POST | `/events` | `{ event: CreateEvent, templateIds: string[] }` | `{ event: Event }` |
| GET | `/events/{eventId}` | – | `{ event: Event }` with fixtures, groups → option sets, visualiser |
| POST | `/events/{eventId}` | `{ event: UpsertEvent, templateIds?: string[] }` | `{ event: Event }` |
| DELETE | `/events/{eventId}` | – | – |
| POST | `/events/{eventId}/patched-fixtures` | `{ fixtures: UpsertFixture[] }` | `{ fixtures: Fixture[] }` |
| GET | `/events/{eventId}/patched-fixtures` | – | `{ fixtures: Fixture[] }` |
| DELETE | `/events/{eventId}/patched-fixtures/{fixtureId}` | – | – (also removes it from every group) |
| POST | `/events/{eventId}/fixture-groups` | `{ fixtureGroups: UpsertFixtureGroup[] }` | `{ fixtureGroups: FixtureGroup[] }` |
| GET | `/events/{eventId}/fixture-groups/{fixtureGroupId}` | – | `{ fixtureGroup: FixtureGroup }` |
| DELETE | `/events/{eventId}/fixture-groups/{fixtureGroupId}` | – | – |
| POST | `/events/{eventId}/visualiser` | `{ visualiser: UpsertVisualiser }` | `{ visualiser: Visualiser }` |
| GET | `/events/{eventId}/visualiser` | – | `{ visualiser: Visualiser }` |
| DELETE | `/events/{eventId}/visualiser` | – | – |
| POST | `/events/{eventId}/fixture-groups/{fixtureGroupId}/option-sets` | `{ optionSets: UpsertOptionSet[] }` | `{ optionSets: OptionSet[] }` |
| GET | `/events/{eventId}/fixture-groups/{fixtureGroupId}/option-sets/{optionSetId}` | – | `{ optionSet: OptionSet }` |
| DELETE | `/events/{eventId}/fixture-groups/{fixtureGroupId}/option-sets/{optionSetId}` | – | – |

- `templateIds`: the server copies each library template the event doesn't have yet into `events.fixture_templates`. The copy keeps the library template's ID (one copy per template per event), so the client can use library IDs as `fixtureTemplateId` straight away.
- Visualiser: one per event (unique index). `POST` restores a soft-deleted one instead of inserting.

Rules and decisions to remember while building CueSketch v2. The data structures themselves live in the draw.io diagram ("version 2" page), which is the source of truth. This file only records the rules that the diagram can't show.

## Roles

- **LD** sets up the event: templates, fixtures, groups, option sets, selectables, export.
- **Users** only pick selectables per cue (and may override single fixtures).
- Word user-facing text for non-technical people, e.g. "Check with your lighting designer". Keep DMX and template details on the LD side.

## IDs and references

- Anything referenced from **outside** its own JSON gets a stable ID: channels, modes, fixtures, groups, option sets, selectables, note fields.
  - Never reference by name: renaming would break references.
  - Never reference by array position: deleting an item shifts every later one.
- Exception: `Head.channelIndexes` are positions in the head's mode. That is safe because heads live inside the mode and are rebuilt with it.
- IDs inside JSON (channels, modes, selectables) are generated by our code, not by Postgres. They only need to be unique within their parent.
- Names are for display, and for matching at the import/export boundary (QLC+ refers to modes by name).

## What is JSON vs a table

- Fixture templates, including channels, capabilities, modes, heads and physical properties, are **JSON on the event**. They are copied from the library, so editing the library never changes an existing event.
- The `FixtureTemplates` table is the global library shared by all events. Nothing in an event points at it: `PatchedFixture.fixtureTemplateId` is the ID of the event's own copy in `Event.fixtureTemplates`.
- Every table has `createdAt`, `updatedAt` and `deletedAt` (soft delete).
- Postgres can't check IDs that live inside JSON. The resolver has to cope with missing ones (see "Safe setup edits").

## Safe setup edits

The LD must be able to add, edit and delete setup items without breaking existing cues.

- **The resolver never throws on bad references.** Unknown or deleted IDs (fixture, channel, mode, selectable, option set, group) are skipped.
  - A single-select set that holds several picks uses the first by position in `selectables`.
  - If every pick has been deleted, the option set's default is used.
  - Write a test that feeds the resolver garbage IDs.
- **Soft delete, and don't clean up references.** Cues keep IDs that point at deleted items, so restoring the item brings its cues back (free undo).
- **Show the impact before destructive or wide edits**, e.g. "Red is used in 14 cues across 5 songs". Use a jsonb containment query and a GIN index on `cues.selectable_ids`.
- **A new option set applies its default to existing cues** (missing key = default). Tell the LD in the add dialog.
- The exporter uses the same resolver, so exports get the same safety.

## Fixture groups

- `fixtureIds` is membership; `grid.cells` is the optional layout for effects. They are kept separate deliberately.
- Rules:
  1. Every `cells[].fixtureId` must be in `fixtureIds`.
  2. A member without a cell is allowed; effects skip it.
  3. At most one cell per fixture/head pair, and at most one cell per grid position.
- Only change these through helpers:
  - **Add a fixture** to `fixtureIds` and auto-place a cell.
  - **Remove a fixture**: remove the ID **and all its cells**.
  - **Delete a fixture** from the event: do the same for every group.
- The server checks rule 1 on save.

## Selectables

- `fixtureIds: "all"` (the default) includes fixtures added to the group later. A plain list does not.
- Custom selectable:
  - `common` finds channels **by `ChannelType`** on each fixture, because channel IDs differ between templates. Fixtures without that channel type are skipped.
  - `individual` targets one fixture's channel by ID and overrides `common`.
  - `common` is reliable for linear channels (dimmer, RGB, zoom, pan/tilt). It is unreliable for ranged channels (shutter, gobo, colour wheel), because the same DMX value means different things on different fixtures.
- Intensity, per fixture:
  - master dimmer present: set the master to the value and open the per-head dimmers fully;
  - else per-head dimmers: set them;
  - else no dimmer: scale the colour channels.
- Colour is one value for all fixtures (no per-fixture map). `hex` is the complete look and must work on its own; `mix` is an optional exact recipe for fixtures that can do better. Brightness comes only from intensity: the colour picker has hue/saturation only, so `hex` is always at full brightness. Per fixture:
  - Use `mix` only if the fixture has **every** channel `mix` sets above 0. Otherwise ignore it (a partial mix looks wrong, e.g. warm white without its amber).
  - Otherwise derive from `hex`:
    - RGB: set directly.
    - RGBW: extract white (`w = min(r,g,b)`, subtract it from r/g/b). Saturated colours are unchanged.
    - CMY: convert QLC+-style (CMYK with the K dropped), so dim colours come out fully saturated and black comes out as open white.
    - Amber/UV/lime/indigo: 0. Only set through `mix`.
    - Wheel only: use the nearest capability colour.
    - No colour channels: skip.
  - Fake colours (UV on RGB) by picking a `hex` that looks close, e.g. a purple for UV.
  - Pattern selectables use the same `Colour` type.
- Position is per fixture: `positions: {[fixtureId]: Position}`, values 16-bit (0–65535) as DMX, not degrees.
  - Per axis, find the channel by `ChannelType` + role in the fixture's mode: coarse = `value >> 8`, fine = `value & 0xFF`. No fine channel: coarse only. No channel: skip that axis. A fine channel without a coarse one is ignored.
  - `zoom` and `focus` are optional. Missing = don't write, so another option set (e.g. beam size) can control them.
  - A fixture with no entry (e.g. added to the group later with `fixtureIds: "all"`) is skipped; the LD UI warns.
  - Several pan/tilt channels (multi-head): use the first in mode order for now.
  - Visualiser: degrees = `value / 65535 × maxPan` (or `maxTilt`); zoom uses `value / 65535` in the beam-angle rule. Focus is not previewed.
  - QLC+ import: `PositionPan`/`PositionPanFine` (and tilt) presets, or `<Group Byte="0|1">Pan</Group>`.
- Effects (pattern/movement) are **preview and labelling only**. On export they map to an effect the LD built in the console. Keep the options small.
- Pattern effects have an LD-set **blend mode** (normal / mask / additive / subtractive, like QLC+ RGB Matrix). The preview resolves static selectables first, then applies pattern effects on top, per channel (formulas from QLC+ `universe.cpp`):
  - normal: HTP/LTP as usual
  - mask: `base × effect / 255`
  - additive: `min(base + effect, 255)`
  - subtractive: `max(base − effect, 0)`
- With mask, the effect's colours act as brightness: white shows the base colour, black turns it off.

## Cue order

- Cues have no `order` field. **`Item.rawLyrics` is the source of truth**: a cue's position is where its `{cueId=…=cueId}` / `<cueId=…=cueId>` marker appears in the lyrics. Cue numbers are derived (index + 1), never stored.
- One parser rule, implemented identically in TS (`getCueOrder`) and Go (for export), with shared test cases (both bracket styles, markers next to hyphens, duplicates).
- Duplicate markers: the first occurrence wins.
- Orphans (a cue whose marker is not in the lyrics): hidden and left out of export, but not deleted. Putting the marker back restores it. The LD side may list them as "unplaced cues".
- Sections with no lyrics (intro, solo) use marker-only lines such as `[Intro]`.
- Alternate cues take their position from their parent cue.

## Order

- `OptionSet.priority` exists in the design (TODO there: "determines application order; remove if the visualiser doesn't need it"). How it combines with the rules below is undecided; until then the write order into the console's cue (e.g. QLC+ Collection) is:
  1. **Static selectables first** (intensity, colour, position, custom).
  2. **Pattern and movement effects after**, so a mask is always written after the colour/intensity it masks. QLC+ applies faders in start order (`Universe::processFaders`); a mask written first would be overwritten.
  
  Within each step, sort by `group.sortOrder`, then `optionSet.sortOrder`, then position in `OptionSet.selectables`. The output never depends on database row order.
- Write order does not say who wins; the console does. In QLC+:
  - LTP channels: the last write wins.
  - HTP channels (the Intensity group, including RGB): the highest value wins.
- The preview uses the same order and treats "later wins" as an approximation.
- Two static sets writing the same LTP channel (e.g. a position with zoom and a "Beam size" set): `optionSet.sortOrder` decides. The LD reorders sets to change it.
- If a console ever needs a different write order, put the override in the export mapping, not on `OptionSet`.

## Overrides

- Users can set **custom DMX values** on fixtures in a cue. These replace whatever selectables set on those channels.
- Exporting overrides needs path 2 (fixture links), because they are generated as a custom scene.
- When an override changes channels that a selectable already sets, warn: "The values you are changing are already being set by _selectable XYZ_. Changing these values may have unexpected effects. Check with your lighting designer."

## Fixture templates and QLC+ import

- Heads (QLC+ "Emitters") belong to the **mode**.
  - No heads means one head containing all channels, which is QLC+'s behaviour. The whole fixture is then one pixel and one beam.
- **Master dimmer comes from the channel type:** `MASTER_DIMMER` controls the whole fixture, `DIMMER` controls one head. Head membership doesn't decide it (QLC+ files sometimes list the master inside a head). The LD can change the type.
  - Import: `Preset="IntensityMasterDimmer"` → `MASTER_DIMMER`, `Preset="IntensityDimmer"` → `DIMMER`.
  - Import fallback for files without presets (`<Group>Intensity</Group>`, no colour): a dimmer in no head of a multi-head mode → `MASTER_DIMMER`, otherwise `DIMMER`.
- A `.qxf` channel comes in one of two forms:
  - `Preset="IntensityRed"`: look the preset up in a table to get type, colour and fine.
  - `<Group Byte="0">Intensity</Group>` + `<Colour>`: combine group and colour into our `ChannelType`.
  - `Byte="1"` means fine.
- A preset channel often has no `<Capability>`. QLC+ generates one 0–255 range with a name from the preset, so the importer does the same.
- Keep the original preset string (`sourcePreset`) only for re-export.
- **Reversed channels** (`BeamZoomBigSmall`, `ShutterStrobeFastSlow`) need a `reversed` flag on the channel.
- `<Physical>` can be overridden per mode in QLC+. That is rare; use the fixture-level one.
- QLC+ `.qxw` fixtures refer to a mode by its **name**. Match by name on import and export only.

## Visualiser

- **Beam angle:**
  - min = max: a fixed lens.
  - Otherwise, map the zoom channel linearly from min to max (16-bit if there is a fine zoom channel; invert if `reversed`).
  - No zoom value set: use the channel's `defaultValue`.
  - Missing lens data: fall back to 10°–30°, like QLC+.
  - Spot radius = `distance × tan(angle / 2)`.
- `brightnessModifier` is CueSketch-only, for visualiser calibration.

## Export

- **Path 1 (default):** map each selectable to console functions the LD already made (scenes, RGB Matrices, EFX). No addresses are needed.
- **Path 2:** for user overrides that must be generated. The LD links each CueSketch fixture to a console fixture, picked from the uploaded console file.
- CueSketch stores no universe/address. Add them only for automatic fixture linking, generating a show from scratch, or live DMX output.
- The design is software-agnostic: QLC+ is the first adapter. Nothing in the core data model should be QLC+-specific.
