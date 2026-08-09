---
name: add-event-form-fields
description: Add or modify fields in lighting-cue-maker's shared EventForm while keeping domain and form types, create/edit UI, defaults, request types, and bidirectional form-to-API/DB conversions synchronized. Use when adding, renaming, changing the representation of, or removing event, fixture-group, attribute, metadata, or other nested fields handled by EventForm.
---

# Add Event Form Fields

Follow the field through the entire create and edit lifecycle. Do not assume that adding an input automatically persists it.

## Workflow

1. Search for the field and inspect its current domain, form, request, and backend representations.
2. Update the canonical domain type in `src/types/types.ts`.
3. Update form-specific types in `src/components/EventForm/eventFormModel.ts` when the form representation differs from the domain representation.
4. Update request types in `src/types/http.ts` when the API payload shape changes.
5. Add the UI field in `src/components/EventForm/EventForm.tsx` or the relevant nested component, such as `AddAttributeCard.tsx`.
6. Add a correctly typed default in whichever constructors own the field:
   - `createEmptyEventFormValues`
   - `createEmptyEventFormAttribute`
   - `createEmptyEventFormFixtureGroup`
7. Update DB/API-to-form conversion in `eventToEventFormValues` when loading the field requires mapping, normalization, or a default.
8. Update form-to-DB/API conversion in both:
   - `eventFormValuesToCreateRequest`
   - `eventFormValuesToUpdateRequest`
9. Update relevant backend DTOs, models, handlers, and migrations if the API or persisted schema does not already accept the field.
10. Add or update conversion tests in `eventFormModel.test.ts`, then run the focused tests, lint, and type checking available in the repository.

## Representation conversions

Keep UI representation choices out of the persisted domain model. When the same value has different representations, update both conversion directions:

- `formAttributeMetadataToAttributeMetadata` for form-to-API/DB conversion.
- `attributeMetadataToFormAttributeMetadata` for API/DB-to-form conversion.

For example, Mantine radio values are strings, while persisted `required` metadata should be boolean:

```ts
// Form -> API/DB
required: metadata.required === "true"

// API/DB -> Form
required: metadata.required ? "true" : "false"
```

Apply the same rule to dates, nullable values, numeric input strings, select values, and any other field whose form representation differs from its persisted representation.

Skip a conversion helper only when the form and domain representations are genuinely identical. Preserve fields in both directions when an edit round trip would otherwise erase existing data.

## Invariants

- Keep `clientId` frontend-only.
- Preserve backend `id` for existing fixture groups and attributes; omit it for new records.
- Derive persisted `order` from `fixtureGroupOrder` and `attributeOrder` when serializing.
- Keep create and edit behavior aligned unless the product explicitly requires a difference.
- Verify that untouched defaults, existing backend values, and newly entered values all survive a save-and-reload round trip.
