---
name: add-attribute-type
description: Add or modify lighting-cue-maker attribute types across domain types, EventForm representations and conversions, cue ValueAssignment types and defaults, optional configuration and CueCard inputs, tests, and backend option propagation. Use when introducing, renaming, or changing an AttributeTypes member or its option/value shape.
---

# Add Attribute Type

Keep the selected scope explicit. If the user requests only types and conversions, do not add inputs or backend changes. If they request full end-to-end support, follow every applicable step below.

## Workflow

1. Search for `AttributeTypes`, `AttributeTypesOptions`, `ValueAssignment`, and similar existing types before editing.
2. Choose the closest existing attribute type as the implementation pattern.
3. Update the domain and form representations.
4. Update cue assignment typing and default creation.
5. Add UI and backend support only when requested.
6. Add focused conversion/default tests, then run tests, lint, build, and `git diff --check`.

## Domain types

Update `src/types/types.ts`:

- Add the serialized value to `AttributeTypes`.
- Define a named option type for object-shaped values.
- Add the configuration shape to `AttributeTypesOptions`. Use an array when an attribute offers several choices.
- Add the type to `AttributeMetadata.defaultValue` when it can be a default.

Update `src/types/cues.ts`:

- Add the value selected for one cue to `ValueAssignment`.
- Store one object when the user can select one option, even if `AttributeTypesOptions` stores an array of available objects.

Example distinction:

```ts
type PositionOption = { pan: number; tilt: number; name: string };

// Attribute configuration: all choices
[AttributeTypes.PRESET_POSITION]?: PositionOption[];

// Cue assignment: one selected choice
[AttributeTypes.PRESET_POSITION]?: PositionOption;
```

## EventForm conversions

Mantine number inputs are represented as strings in this form. In `src/components/EventForm/eventFormModel.ts`:

1. Omit the new key from `AttributeTypesOptions` when its form shape differs.
2. Define a form-specific type with string number fields.
3. Re-add the key to `EventFormAttributeOptions` using that form type.
4. Add its empty value in `createEmptyEventFormAttribute`.
5. Add a case to `formAttributeOptionsToAttributeOptions` that converts strings with `Number(...)` for create and update requests.
6. Extend `attributeOptionsToFormAttributeOptions` to convert persisted numbers with `String(...)` when loading edit forms.

Preserve non-numeric fields such as names unchanged in both directions. Both create and update requests already use `formAttributeOptionsToAttributeOptions`; do not duplicate conversion logic.

## Cue defaults

Update `createDefaultValueAssignment` in `src/utils/cueUtils.ts` so a newly created or reconciled cue receives a valid value for the new type.

- Validate object-shaped metadata defaults with a small type guard.
- Copy selected objects instead of sharing their references.
- If there is no metadata default, use the first configured option when that matches the existing preset behavior.

Do not add the type to QLC mapping unless its mapping representation and key format are defined.

## Optional UI work

Only when requested:

- Add the configuration choice and handler under `src/components/FixtureGroup/Attribute/AddAttributeCard`.
- Add the cue input to `src/components/Siding/CueCard/CueCard.tsx`.
- Keep `CueCardDemo.tsx` aligned when demo support is requested.
- For object-valued single selection, let the control use a string identifier internally and save the complete selected object in `ValueAssignment`.

Do not create speculative inputs when the user plans to implement them.

## Optional backend work

Only when backend support is in scope, update the server's attribute-type constant and serialized option struct. Audit every manual `AttributeTypeOptions` reconstruction in event and standalone attribute handlers; otherwise the new field can be silently discarded.

An option stored through the existing JSON serializer generally does not need a database column migration, but verify the current backend model before claiming this.

## Verification

Add focused tests in `src/components/EventForm/eventFormModel.test.ts` for both directions:

- persisted numeric values become form strings;
- form strings become request numbers.

Add cue default tests when default behavior changes. Then run:

```powershell
npm.cmd test -- src/components/EventForm/eventFormModel.test.ts --run
npm.cmd run lint
npm.cmd run build
git diff --check
```

Report unrelated existing warnings separately; do not fix them outside the requested scope.

