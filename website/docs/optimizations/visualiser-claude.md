# Visualiser v2 optimization plan (Claude)

Written 15 November 2026. Scope: `src/components/Visualiser3D-v2`, the pattern-effect / DMX path that feeds it, and the installed three.js 0.186.0, @react-three/fiber 9.7.0 and drei 10.7.8.

This started as a plan from reading the code and the installed three.js source. Steps 1 to 6 are now done on branch `optimize/visualiser-claude`; see [Status](#status-15-november-2026) below. The sections after it are the original plan, unchanged. A second plan from the same day is in [visualiser-codex.md](visualiser-codex.md); the two broadly agree, and the differences are listed at the end.

## Status (15 November 2026)

| Step | State | Commit |
| --- | --- | --- |
| 1. Measure first | Done: bench at `/dev/visualiser-bench` | `d8c715a` |
| 2. Effects in the render loop | Done | `93d1681` |
| 3. Render only when something changes | Done | `8e99f2c` |
| 4. Light table | Done, and on by default in the real visualiser | `6e7350d`, `56c5ed7`, `c11d0c8` |
| 5. Shared shadow storage | Done, with step 4 | same |
| 6. LED draw cost (instanced lenses) | Done | `3d4d98f` |
| 7. Warm-up | Not needed, see below | – |
| Interim: 8 shadows in the viewer | Done, then replaced by step 5 | `7d1e19f` |

### Measured

All numbers are from the bench on the development machine (NVIDIA GPU, 165 Hz screen, headless Chrome, production build, 1/3 resolution scale, 444 × 250 canvas). **Nothing has been measured on integrated graphics yet**, which is the target hardware.

| | Before | After |
| --- | --- | --- |
| Static scene, camera at rest | 165 draws/s | 0 draws/s |
| Camera orbit | 165 draws/s | 60 draws/s (the cap) |
| Fade: effect updates per second, scene commits per second | about 29, 29 | 60 (every drawn frame), 0 |
| 30 spots: shadows cast | 8 | 30 |
| 30 spots: first frame CPU, shader builds | 174 ms, 18 | about 70 ms, 10 |
| Shadow redraws per frame while the camera moves | 8 | 0 |
| 100 shadowed spots | black scene (texture limit) | 60 fps, GPU about 1 ms |
| 100 spots + 64 LED heads: time to first frame | 5.7 s | 0.2 s |
| 256 LED heads | about 1.5 minutes to load (user's run) | loads at once |
| 1024 LED heads | shader fails to build, nothing draws | 60 fps |
| 100 spots + 1024 LED heads: draw calls, CPU per frame | – | 179, about 2.5 ms |
| First camera sweep after load (100 spots + 256 LED heads) | freezes on first view of each area | 0 shader builds, no frame over 6.4 ms |

### Where the result differs from the plan

- **Step 7 (warm-up) was dropped.** With the light table the shaders no longer depend on the lights, so nothing is built when the camera first turns. The one remaining first-use build measured (turning haze to zero) took 2.5 ms.
- **Lights that are off are left out of the table** when it is packed each frame, so the shader never visits them. This was not in the plan and makes chases cheap.
- **Shadow redraws are capped at 32 layers per frame.** A change that dirties more (loading 100 spots, moving a stage object) finishes over the next frames; until a layer is drawn its light is dark.
- **Shadow memory follows the fixture count.** The array starts at 8 layers and doubles up to 256. A layer is about 1.3 MB at 512 × 512, including an unused colour byte per pixel that three's render target requires.
- **LED heads are cones**, with the same on-axis brightness as the panel lights they replace (intensity × lens area). That brightness is about 140 times lower than a spot's, as before. `LED_HEAD_GAIN` in `Visualiser3DFixture.tsx` scales it.
- **three.js picks up a changed data texture one draw late.** With draw-on-demand that left the last shadow layers of a load dark until the camera moved. The table and shadow-matrix textures are uploaded explicitly (`renderer.initTexture`) when they change. The cause inside three was not found.
- **MSAA on the solid pass was left on.** The bench has a toggle to compare.
- **The old per-light path still exists** behind `lightTable: false` on the renderer factory. Only the bench uses it, for comparison.

### Still open

- Measure on integrated graphics at 1/4 scale: the per-pixel light loop is the part that could be slow there. If it is, the options are smaller shadow maps, fewer haze steps, or tile light lists.
- Not exercised in a browser by Claude: gizmo drags, lil-gui edits and undo in the editor under draw-on-demand; moving a stage object (which redraws all shadow layers). The user confirmed on the event page that effects play and stop correctly, and in the bench that a dragged fixture's light and shadow follow.
- Pan and tilt are still not decoded. When they are, moving heads will redraw their shadow layers every frame, which is where the 32-per-frame cap will matter.
- `tsc -b` fails on two unused variables in the timeline code (`TimelineRuler.tsx`, `timeline.ts`), unrelated to this work, so `npm run build` stops before `vite build`.

## Goals

1. Minimum 60 fps at 1/2 resolution scale on a 1080p screen.
2. Up to 100 shadow-casting spotlights, if possible.
3. Minimal performance loss when adding high-head-count LED fixtures.
4. Shadows must be preserved.
5. Minimize GPU usage.
6. Reduce render work when nothing changes.

## Decisions (15 November 2026)

- **Target hardware:** integrated graphics. On integrated graphics the 60 fps target is at **1/4 resolution scale**, not 1/2. The 1/2-scale target applies to stronger GPUs.
- **Measuring:** Claude builds the step 1 test scenes and an on-screen readout (frame gaps, shader builds, shadow redraws). The user runs them on the target machine and reports the numbers before and after each step.
- **Order:** steps 1–3 first. Then prototype steps 4–5 on a small test scene before changing the real fixtures.
- **Interim shadows:** give the viewer the same 8-shadow cap as the editor now (today the viewer has none).
- **Pattern preview:** the Step 5 `PatternPreview` must move to the new effect player too. No second copy of the effect clock or timing code.
- **Where:** branch `optimize/visualiser-claude`, worktree `I:\Coding\lighting-cue-maker-visualiser-optimization-claude`.

## What causes each reported symptom

| Symptom | Cause | Confidence |
| --- | --- | --- |
| Lag spikes when moving the camera | three builds each mesh's shader and pipeline the first time the mesh enters the view, synchronously. The lit shader has one code block per light, so the build grows with light count. | Likely, not confirmed at runtime |
| Crash (black scene) with many shadow-casting lights | Each shadowed spotlight is its own texture in every lit shader. WebGPU allows 16 sampled textures per shader stage by default. | Confirmed in code |
| Pattern effects skip frames while the camera stays smooth | The effect runs on `setTimeout` → React state → `EventPage` re-render → scene commit, separate from the render loop. When the render loop is busy, React's commits are starved. | Confirmed in code; matches the earlier perf-probe measurement that scene commits fell to 1/2–1/3 of clock ticks |

### Camera spikes in detail

- three's WebGPU renderer creates a render object, bindings and pipeline for a mesh the first time it is drawn in a given pass. Meshes outside the view are culled, so this work happens when the camera first turns towards them.
- The lighting shader's cache key is built from every light's id and `castShadow` flag (`LightsNode.customCacheKey()`). Adding, removing or toggling a light therefore rebuilds every lit material. Changing only colour or intensity does not.
- Camera movement alone does not change that key, and lights are not culled by the view. So a spike on a repeated sweep over the same area would point to something else (garbage collection, GPU saturation at 165 Hz).
- Selecting a fixture mounts an outline mesh with a new material variant, which is a first-time build too.

To confirm: count shader builds with `renderer.debug.onNodeBuilderCreated` and compare them against frame gaps on a first camera sweep and on a repeated one.

### The shadow cap in detail

- `MAX_SHADOW_CASTERS = 8` in [StagePreview3D.tsx:32](../../src/components/Visualiser3D-v2/Stage3D/StagePreview3D.tsx#L32) keeps the editor under the 16-texture limit.
- The viewer gets no shadows at all: `shadowCasterIds` returns an empty set when `isViewOnly` (line 105).
- The set of shadow casters is fixed on purpose. Toggling `castShadow` at runtime left three reusing bindings that pointed at a destroyed shadow map.
- Raising the cap only brings the crash back. Smaller shadow maps do not help either, because the limit is on the number of textures, not their size.

### The effect lag in detail

- `useEffectClock` schedules a `setTimeout` per tick and stores the time in React state ([useEffectClock.ts](../../src/hooks/useEffectClock.ts)).
- `useResolvedDmx` is called in `EventPage`, so every tick re-renders the page, runs `applyPatternEffects` and `applyOverrides`, and pushes new arrays through every fixture ([useResolvedDmx.ts](../../src/hooks/useResolvedDmx.ts)).
- Each fixture then decodes its DMX again and R3F re-applies colour and intensity props, parsing hex strings into colours.
- Fades tick at 30 per second (`FADE_FRAME_MS`), plus 1 ms added by the clock, so a 60 fps canvas can only show about 29 effect updates per second.
- Scheduler bug: `getNextPatternChangeDelay` returns early for a fading pattern, so a nearer step of another pattern is missed ([applyPatternEffects.ts:50](../../src/effects/pattern/applyPatternEffects.ts#L50)).
- Per tick, `applyPatternEffects` rebuilds its fixture, template and channel maps, and `decodeHeadStates` rebuilds its channel map per fixture.

## Other costs found

| Finding | Where | Effect |
| --- | --- | --- |
| The haze pipeline is destroyed and rebuilt whenever the `environment` object changes | [Visualiser3DVolumetrics.tsx:91](../../src/components/Visualiser3D-v2/Visualiser3DVolumetrics.tsx#L91) | Every step of the haze or ambient slider reallocates render targets and rebuilds the shader graph. |
| Shadow maps use `autoUpdate` | three's `ShadowNode.updateBefore` | Every shadow map is redrawn every frame, even when no light or object moved. |
| Both canvases use the default continuous frame loop | [Visualiser3D.tsx:550](../../src/components/Visualiser3D-v2/Visualiser3D.tsx#L550), line 843 | A static scene still renders at display rate (165 Hz on the development screen). |
| 4× MSAA is on by default | R3F passes `antialias: true`; three then uses 4 samples | Extra GPU cost on the solid pass, and wasted on the blurred haze pass. |
| Haze runs even at zero strength | [Visualiser3DVolumetrics.tsx:75](../../src/components/Visualiser3D-v2/Visualiser3DVolumetrics.tsx#L75) | The ray-march and blur execute, then are multiplied by zero. |
| Each LED head is its own mesh, material and `RectAreaLight` | [Visualiser3DFixture.tsx:113-137](../../src/components/Visualiser3D-v2/Elements/Visualiser3DFixture.tsx#L113-L137), lines 211-222 | One draw call per lens, and one of the most expensive light types per pixel, on surfaces and in every haze step. |
| Off heads stay mounted as lights | [Visualiser3DFixture.tsx:171-173](../../src/components/Visualiser3D-v2/Elements/Visualiser3DFixture.tsx#L171-L173) | The comment says off heads are skipped; they are not. Unmounting them would recompile shaders, so the fix is the light table below, not unmounting. |

## The plan

Steps 2 and 3 are small and independent of each other. Steps 4 and 5 are the large rewrite and should be prototyped on a small scene first.

### 1. Measure first

- Build fixed local test scenes: 8, 30, 60 and 100 spots; 64, 256 and 1024 LED heads. Include the floor, cuboids and humans so shadow errors are visible.
- Record per run: frame gaps (p95, p99, not only the average), shader builds, draw calls, shadow redraws, and GPU % from Task Manager.
- Use a production build, and record the GPU, the browser version and the real canvas buffer size. The canvas uses `devicePixelRatio × scale`, so "1/2 scale" is only 960 × 540 when OS scaling and browser zoom are both 100% and the canvas fills a 1080p screen.
- The existing `perfProbe` "draw" figure is CPU submission time, not GPU time. Its reporter keeps its own animation-frame loop alive, so turn it off when testing idle behaviour.

Serves: all goals. Without it there is no way to say a goal was met.

### 2. Move effects into the render loop

- One effect player inside the canvas, run from a single `useFrame`. It computes the current state from an absolute cue time just before the frame renders. After a slow frame it computes the current state once; it does not replay missed ticks.
- Each fixture's lens and light values are written directly to the three objects through refs. No React state per tick.
- Delete `useEffectClock` from the event page. `EventPage` re-renders only when the cue or setup changes.
- Precompute when the cue or setup changes: fixture → template → channel mappings, each pattern's target cells, palettes and random orders.
- Compute each step's colours once when the step starts. During a fade, only interpolate between the previous and current step.
- Keep the pure resolver semantics: seeded randomness, first step fading up from black, blend order, overrides applied last. The existing tests in `effects/pattern/__tests__` stay the reference.
- Fix the scheduler bug as part of this (it disappears once the clock is the frame loop, but the pattern preview in Step 5 still uses the delay function).

Serves: goal 1 during effects. Fixes the effect lag.

### 3. Render only when something changes

- Set `frameloop="demand"` on both canvases. drei's `CameraControls` already invalidates while the camera moves. The volumetrics `useFrame` already replaces R3F's default draw in demand mode.
- Invalidate on: cue or DMX change, object transform (including gizmo drags before they are saved), selection, resize, environment change, loaded assets. The effect player invalidates every frame during a fade, and schedules one wake-up at the next step during a hold.
- Cap submission at 60 fps so high-refresh screens do not render 165 times a second.
- Build the haze pipeline once per renderer, scene and camera. Make haze strength a uniform. Remove `environment` from the effect's dependencies.
- At zero haze, switch to a solid-only output that skips the ray-march and blur.
- Turn MSAA off on the haze pass. Measure the solid pass with and without it at half scale and keep it only if the difference is visible.

Serves: goals 5 and 6, and goal 1 on high-refresh screens.

### 4. Light table

The comment on `HeadLights` in [Visualiser3DFixture.tsx:141-152](../../src/components/Visualiser3D-v2/Elements/Visualiser3DFixture.tsx#L141-L152) already names this direction.

- Replace the per-light three lights with one data buffer holding every head: position, direction, cone, range, colour × intensity, shadow layer index.
- One loop in a custom lighting node reads that buffer. The same node lights the solid materials and the haze volume.
- The buffer has a fixed capacity. Adding, removing, turning on or turning off a light changes data, not shader source. This removes the recompile on topology changes, and with it the destroyed-shadow-binding bug.
- Each pixel rejects a light by range and cone before doing any shadow lookup. For most pixels most lights fail this test, which is one dot product.
- LED heads become cheap cone entries in the same table instead of `RectAreaLight`s. Every head keeps its own colour on the floor and in the haze, so chases still read correctly (the commented-out `CombinedPanelLight` averages them, which changes the look).
- If per-pixel rejection is not enough at 100 overlapping beams, add tile or cluster light lists later. Do not start there.

Rough work counts at 960 × 540 with 100 lights: about 52 million cone tests for a fully covered screen, and about 39 million for the quarter-resolution haze at 12 steps. These are cheap tests before any shading, not measured GPU time.

three's own addons do not cover this: `ClusteredLightsNode` only handles unshadowed point lights, and `DynamicLightsNode` excludes shadow-casting lights.

Serves: goals 1, 2, 3 and 5. Also removes the main suspected cause of the camera spikes.

### 5. Shared shadow storage

- One depth texture array, one layer per shadow-casting spot, with a stable light → layer mapping. The table entry holds the layer index and the light's shadow matrix.
- One array is one texture binding, so the 16-texture limit no longer applies. WebGPU's baseline allows 256 layers.
- Storage at 100 layers: about 100 MB at 512 × 512, about 25 MB at 256 × 256. Start at 512 and check shadow edges before going lower.
- Turn off automatic updates. Redraw a layer only when its light moves or its cone changes. Redraw all layers when a stage object moves, appears or disappears (edit time only, so a conservative "all" is fine to start).
- Camera movement and colour or intensity changes redraw nothing.
- The surfaces and the haze sample the same array. Use the hardware comparison sampler; fewer filter taps in the haze than on surfaces.
- three supports the pieces: a custom node through `light.shadow.shadowNode`, and array layers in its shadow filters. `TileShadowNode` shows the render-into-a-layer pattern, but it splits one light's view; it is not a manager for 100 separate spots. Layer ownership, per-layer clearing and disposal are custom work.

Serves: goals 2 and 4.

### 6. LED draw cost

- Draw all lenses as one instanced mesh per lens shape, with a per-instance colour written by the effect player.
- LED heads have no shadows today, so nothing is lost. Optionally give each multi-head fixture one shared shadow layer used by all its heads, which adds shadows for one layer per fixture instead of one per head.

Serves: goal 3.

### 7. Warm up

- After the scene and lights are ready, call `renderer.compileAsync(scene, camera)` and do a controlled warm-up render of each pass (solid, shadow, haze, blur, both haze-on and haze-off outputs), so no shader builds happen during interaction.
- Include the selection outline variant.

Serves: goal 1. With step 4 done this is a one-time cost per session instead of per light change.

## Limits to expect

- **100 fixed shadowed spots at 60 fps** is realistic on a discrete GPU after steps 4 and 5. On integrated graphics it cannot be promised without measuring. The target machine is not decided yet.
- **100 spots all moving at once** is the hard case. Each needs its depth layer redrawn every frame, and three's per-pass overhead likely makes that too much CPU. The fallback is a per-frame update budget, which leaves some lights with slightly stale shadows; that is a quality compromise to choose knowingly, not a silent default. The decoder does not read pan or tilt yet, so this is not a problem today.
- **Until steps 4 and 5 land, the old behaviour (every spot casts a shadow) cannot come back.** The interim option is to give the viewer the same 8-shadow cap the editor has.
- **Adding LEDs will not be free.** After steps 4 and 6 the cost per head is one table entry and one instance, which is small but not zero.

## Acceptance tests

| Test | Required result |
| --- | --- |
| Static scene, camera at rest | No scene or shadow rendering after the camera settles. |
| Camera orbit, 100 fixed shadowed spots | Correct shadows, zero shadow redraws, p99 frame gap under 16.7 ms on the chosen machine. |
| Colour and intensity fades across 100 spots | An effect update on every presented frame; no `EventPage` render per frame; zero shadow redraws. |
| Move one spot, then one stage object | Shadows update on the same frame on surfaces and in haze. |
| 64 / 256 / 1024 LED heads | Record the CPU and GPU cost of each step up; each head's colour still visible on the lens, floor and haze. |
| Add or remove a fixture, select, toggle haze | No shader build during the interaction after warm-up. |
| Ten minutes of mixed playback | No growth in texture, pipeline or memory counts. |

## Where this differs from visualiser-codex.md

- **Order.** This plan does the light table (step 4) before shared shadow storage (step 5). The table removes recompiles on light changes and the cached-binding bug, and the shadow array needs the table's per-light data anyway. The other plan caches shadow maps and builds the array first, and treats the buffered light loop as a later step if measurements require it.
- **Shadow caching on the current renderer.** The other plan has a separate step for disabling `autoUpdate` on today's per-light shadow maps. That is worth doing only if steps 4 and 5 are delayed; it helps 8 lights, not 100.
- **Camera spikes.** This plan names first-time shader and pipeline builds as the most likely cause. The other plan leaves the cause open. Both say to confirm by measuring.
- **Target hardware.** The other plan assumes laptop integrated graphics. This plan leaves the target undecided.

The three.js claims in the other plan that were re-checked against the installed source hold: the light cache key, the shadow update logic, the 4-sample MSAA default, array-layer support in the shadow filters, and the limits of the clustered and dynamic lighting addons.
