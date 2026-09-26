# Visualiser history

The 3D visualiser keeps an undo/redo history for fixture updates and changes to its 3D objects. `Ctrl+Z` undoes a change; `Ctrl+Shift+Z` redoes it. The history is held in the Zustand visualiser slice and is not persisted across reloads.

## What an entry contains

Each change has a `before` value and an `after` value. A value contains either a fixture update or an `objects3D` array. Fixture entries identify the fixture and store its editable fields; object entries store the complete 3D object array. The slice copies entries when adding or returning them so later edits cannot alter a saved value.

`historyPointer` is the index of the last applied change. It starts at `-1`. Undo returns the current change's `before` value and decrements the pointer; redo returns the next change's `after` value and increments it. Both return `null` when there is nothing to apply. Adding an edit after undo discards the remaining redo entries.

For example, if a fixture moves from X=10 to X=20, then to X=30, two changes are stored. Two undos restore X=20 and X=10. A redo restores X=20. If the fixture is then moved to X=15, the old X=30 redo is discarded.

## How entries are recorded

- [`useUpsertFixture`](../src/query/useUpsertFixtures.ts) records the server's previous and updated fixture after a successful update. It strips timestamps and skips unchanged values. Creation is not added to history.
- [`useUpsertVisualiser`](../src/query/useUpsertVisualiser.ts) records previous and updated `objects3D` arrays when a request includes `objects3D` and the arrays differ. Saves of camera, environment, 2D objects, and fixture attribute mappings do not create object history entries.
- Both hooks accept `{ recordHistory: false }` for requests made while restoring an undo or redo. A restore still persists to the server and updates or invalidates the relevant query.

## Applying undo and redo

[`Visualiser3D`](../src/components/Visualiser3D/Visualiser3D.tsx) handles the keyboard shortcuts. It ignores a history shortcut while any mutation is in progress or another history action is running. If a 3D object save is waiting in its debounce timer, it saves that visible edit before undoing it.

It then moves the history pointer and sends the selected `before` or `after` value through a mutation with history recording disabled. For 3D objects, it also updates the component's local `stageElements` state; a ref prevents that state update from triggering another autosave. If the restore request fails, the pointer moves back so the action can be retried.

## Current limits

- Fixture creation and deletion have no undo/redo handling. Fixture history currently covers updates only.
- History is global to the app store, with no per-event separation or size limit. Switching events does not clear it.
- Fixture transform saves in [`StagePreview3D`](../src/components/Visualiser3D/Stage3D/StagePreview3D.tsx) have their own debounce timer. An undo made before that timer fires may target the preceding saved edit.
- Only the 3D visualiser has keyboard handlers for applying this history. Other screens may record fixture or 3D object changes through the same mutation hooks, but cannot apply them locally.
