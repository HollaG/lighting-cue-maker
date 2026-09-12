# Shared cursors

`EventPage` mounts one `RemoteCursorOverlay`. It captures the local pointer and renders one `Cursor` per remote client ID. Each `Cursor` owns one `PerfectCursor` animator. A hidden, missing or offscreen anchor changes visibility without unmounting that component. Expired peers and room changes remove it.

## Anchor format

```ts
{
  itemId: "selected-item-id",
  surface: "lyrics",
  anchorId: "3:5", // source line 3, token 5; independent of visual wrapping
  xRatio: 0.4,
  yRatio: 0.5,
}
```

Lyrics mark each word wrapper. Cue cards use the same format with `surface: "cueCard"` and the cue UUID as `anchorId`. Ratios are relative to that anchor's bounding rectangle. The receiver resolves it in its own DOM and the overlay is portalled to `document.body`, so translated or scrolling ancestors cannot change its coordinate origin.

## Adding another surface

1. Add its name to `CURSOR_SURFACES` in `src/types/cursors.ts`.
2. Mark the root with its surface and current item:

   ```tsx
   <div data-cursor-surface="newSurface" data-cursor-item-id={itemId}>
     <div data-cursor-anchor={stableObjectId}>{/* tracked content */}</div>
   </div>
   ```

3. Use an anchor ID unique within that surface and item. Only mount one root for each surface/item pair.

Capture, throttling, coordinate resolution and rendering are shared; no extra listener or cursor component is needed. Choose a small enough anchor that its meaning remains similar across different layouts (a word or field is more precise than a whole panel).

## Lifecycle and limitations

- Capture runs at up to 24 updates/second and sends only changed anchors, plus a heartbeat every 5 seconds. It rechecks the element under a stationary pointer when layout or scroll changes. Blank space and leaving the window send `cursor: null`.
- The provider merges optional presence fields. Omitted `cursor` preserves it; explicit `null` hides it. Future scroll state can be added alongside `cursor`.
- Each visible peer's anchor is measured on animation frames to follow scrolling, reflow and CSS transitions without React layout-state updates. Hit-testing hides destinations clipped by scroll containers or covered by dialogs. Interpolation between distant anchors is a visual approximation.
- Peers expire after roughly 15–20 seconds without a heartbeat; room changes clear presence. Background-tab throttling may cause a peer to expire and reappear.
- Word indexes assume the same lyric revision on both clients. Editing lyrics can shift indexes. Cue-card ratios point within the same card, but different collapsed states or field layouts may require finer field anchors later.
- The Go server forwards `cursor` as `json.RawMessage`, preserving arbitrary anchors, omitted values and `null`, while adding its own client identity. Restart it after changing that DTO. Older clients using `{surface, point}` are ignored by the new frontend.

## Manual check

Open the same item in two windows with different widths. Move across lyric words and cue cards; resize and scroll both the page and the cue list. Confirm hidden cards hide their cursor, returning to a surface resumes movement, and closing a peer removes its cursor after the heartbeat timeout.
