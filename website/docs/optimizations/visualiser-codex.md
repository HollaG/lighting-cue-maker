# Visualiser v2 optimization plan

Analysis date: 15 November 2026. Scope: `src/components/Visualiser3D-v2`, its current pattern-effect/DMX path, and installed Three.js 0.186.0. This is a plan, not an implemented performance fix.

Target: Chromium on laptop integrated graphics, a 1920 x 1080 output at 1/2 resolution, shadows preserved, smooth 60 fps while interacting or fading, and minimal work at rest. The exact integrated GPU still needs to be selected for acceptance testing. No browser/GPU profiling was performed for this analysis.

## Main conclusion

There are three separate problems: effect scheduling/CPU work, unnecessary rendering, and lighting/shadow scaling. Fixing the first two should improve the existing renderer without a major redesign. Supporting 100 shadowed spots efficiently needs shared shadow storage and probably a different way of evaluating lights; raising the current cap is insufficient.

Camera movement does not normally require new spotlight shadow maps. A spotlight's shadow depends on its own position, aim, projection, and shadow-casting geometry. Changing its colour or intensity also leaves its depth map reusable. Moving a spotlight requires its map to update; moving an object can invalidate several maps. Therefore benchmark 100 fixed lights separately from 100 simultaneously moving lights. The latter is a substantially harder target, not a promised integrated-GPU capability.

## Findings in the current code

| Finding | Evidence | Consequence |
| --- | --- | --- |
| Editor grants shadows to the first eight single-head fixtures; viewer grants none. | `Stage3D/StagePreview3D.tsx:32,104-111` | The temporary fix explicitly removes shadows in normal viewing. Reverting only the cap restores the binding-limit problem. |
| The active renderer is `Visualiser3DFixture`, not the older PAR/moving-light/bar components still in the v2 directory. | `Stage3D/StagePreview3D.tsx:168-178` | Optimizations must target this path. The active decoder currently provides colour/intensity, not pan/tilt. |
| Fades tick at 1000/30 ms, with another millisecond added by the timeout. | `effects/pattern/applyPatternEffects.ts:23,43-54`; `hooks/useEffectClock.ts:35-48` | A 60 fps canvas can display effect values updated only about 29 times per second, before scheduling delays. |
| A fading pattern immediately returns the fade interval instead of considering all deadlines. | `effects/pattern/applyPatternEffects.ts:43-54` | Another pattern's imminent step, or the fading pattern's own step boundary, can be missed. |
| The clock updates React state in a hook called by `EventPage`. | `hooks/useResolvedDmx.ts:76-108`; `pages/Event/EventPage.tsx:93-97` | Each tick invokes the page render and pushes new DMX data through the scene. React Compiler can skip some work, but does not remove this scheduling path. |
| Mapping/decoding metadata is rebuilt during animation. | `effects/pattern/applyPatternEffects.ts:75-126`; `utils/visualiser-v2-decoder.ts:49-82` | Repeated maps, arrays, lookups, colour conversions, and allocations increase CPU/GC pressure. |
| Random fill/single shuffle the entire grid inside each cell evaluation. | `effects/pattern/effects/randomFillSingle.ts:13-18`; `randomSingle.ts:13-16` | For a full N-cell grid, this is quadratic work; fades can evaluate both current and previous steps. Row/column variants repeat smaller shuffles too. |
| Every LED head has its own lens mesh/material and, for multi-head fixtures, a `RectAreaLight`. | `Elements/Visualiser3DFixture.tsx:113-137,153-173,211-223` | LED count adds scene objects/draw submissions and lighting work across surfaces and haze. The combined-panel alternative is commented out. Dark heads remain mounted despite a comment suggesting otherwise. |
| Both canvases use the default continuous frame loop. | `Visualiser3D.tsx:550,843` | A static scene still runs the rendering pipeline at display refresh rate. |
| Haze resources are recreated when the whole environment object changes. | `Visualiser3DVolumetrics.tsx:45-91` | Haze/ambient edits can destroy render targets and rebuild shader graphs. Camera-only movement does not directly trigger this effect. |
| Haze always participates in the pipeline, even when multiplied by zero. | `Visualiser3DVolumetrics.tsx:65-75,113-117` | There is no explicit zero-haze bypass. Haze is already quarter-resolution per axis and uses 12 ray steps; simply lowering it further is not the first optimization. |
| Shadow updates use Three's automatic defaults. | `Elements/Visualiser3DFixture.tsx:193-207`; installed `LightShadow.js` / `ShadowNode.js` | Fixed shadows are eligible for repeated rendering instead of being cached. Count actual shadow passes: the solid and volume passes both consume shadows; do not assume they necessarily render each map twice. |
| R3F supplies `antialias: true`; the renderer forwards it, and scene passes inherit renderer samples. | `visualiser3DRenderer.ts:22`; installed R3F default renderer props and `PassNode.js:800` | The current path enables four-sample MSAA by default, including inherited pass settings. Measure whether it is worth its cost at half resolution, especially on already blurred haze. |

The scheduler issue was reproduced by executing the source function: at time 99 ms, a 100 ms step is due in 1 ms, but another active fade makes it return 33.33 ms. The timeout adds another 1 ms.

A local Node microbenchmark of the actual transpiled effect functions measured random-fill colour evaluation at approximately 0.20 / 2.98 / 45.08 ms for 64 / 256 / 1024 cells. Column chase took approximately 0.003 / 0.006 / 0.023 ms. These are medians after warm-up, excluding React, DMX, rendering, and previous-step fade evaluation. They demonstrate the CPU scaling issue; they are not browser or target-laptop timings.

## Camera lag: what is and is not established

Shader compilation is plausible on first exposure to a material/pass variant or after changing the scene's light topology. The installed `LightsNode.customCacheKey()` includes light IDs and shadow flags. Ordinary camera motion does not change those, and the renderer does not frustum-cull lights out of that list. Changing only colour/intensity should not compile a different lighting shader.

Consequently, do not diagnose every orbit hitch as shader compilation. Record pipeline creations alongside frame gaps, CPU/GC activity, and GPU timings. Compare the first camera sweep against repeated sweeps. More objects/pixels becoming visible, shadow work, and effect calculations are alternative causes. No cause for the reported camera-only spikes has yet been confirmed at runtime.

## Implementation order

### 1. Establish a reproducible baseline

- Use a production build on real integrated graphics; record GPU adapter, Chromium version, power mode, physical output dimensions, canvas buffer dimensions, and device limits. Avoid accidentally testing a laptop's discrete GPU.
- Use deterministic local scenes with 8, 30, 60, and 100 spots; add separate 64, 256, and 1024 LED-head workloads. Include a floor, wall, cuboids, and people to make shadow errors visible.
- Record presented-frame gaps, CPU effect/React costs, GPU time where timestamp queries are available, pipeline creations, draw calls, shadow renders, texture counts, and memory trends. The existing `perfProbe` measures CPU submission time, not GPU completion time. Its reporter also keeps its own RAF alive when enabled, so disable it for idle-power acceptance.
- Profile solid rendering, haze, and shadow generation separately as diagnostic comparisons. Final acceptance always restores shadows and the agreed haze quality.
- Define 1/2 scale using actual dimensions. A 1920 x 1080 physical viewport should produce a 960 x 540 scene buffer; current DPR is `devicePixelRatio * scale`. Browser zoom, OS scaling, and smaller containers must be recorded rather than inferred from the dropdown.

### 2. Repair effect timing and remove animation from page renders

- Calculate the earliest deadline across all patterns, including step and fade-end boundaries. Remove the early return that hides nearer deadlines. Use RAF while fades visibly change; wake at the next step when output is otherwise constant.
- Evaluate from a monotonic absolute cue time immediately before rendering. After a delayed frame or hidden tab, calculate the current state once; do not replay a queue of missed frames. Keep cue reset and override precedence unchanged.
- Prepare fixture/template/channel mappings when setup changes. Prepare selected pattern targets, parameters, palettes, and random order/rank tables when their inputs change. Cache only the active rounds/steps, not an unbounded history.
- Compute previous/current step colours once per step, then interpolate them during fades. Preserve seeded randomness, first-step fade-from-black, blend order, and final overrides. Test unequal fade lengths and multiple patterns with different step durations.
- Keep React responsible for setup and editor state. Use one visualiser frame callback to update existing light/lens refs or GPU buffers. Publish only the snapshots needed by the DMX/editor UI; do not make `EventPage` the animation clock. Reuse the pure resolver semantics rather than inventing a second lighting-effects engine.
- Start with cached arrays and a small runtime object. Introduce workers only if profiling still shows material CPU stalls after removing the quadratic work.

Acceptance: effects update on each presented fade frame; no scheduler-induced missed boundaries; page commits do not track the animation cadence; effect output remains equivalent to existing resolver tests.

### 3. Stop work when unchanged; stabilize the pipeline

- Set both canvases to `frameloop="demand"`. Drei camera controls already invalidate during movement; retain this through damping and programmatic camera moves.
- Invalidate on cue/DMX output changes, object transforms, resize, selection, environment changes, and loaded assets. During a fade request the next frame; during a hold schedule only the next effect deadline. Stop the preview loop when hidden and refresh correctly on return.
- Construct the haze graph once per renderer/scene/camera. Make haze strength a mutable uniform, and update bounds separately from pipeline ownership. Ambient intensity changes should not reconstruct the haze pipeline.
- Use a cached solid-only path at zero haze. Bypass volume/blur execution, rather than just multiplying their output by zero. Prewarm both paths to avoid a new toggle hitch.
- Warm scene, shadow, volume, blur, and composite variants before interaction using the installed renderer's compilation APIs and controlled warm-up renders where needed. Warm actual layer masks and render-target formats; `compileAsync(scene, camera)` alone should not be assumed to prepare every custom pass or offscreen material. Do this after assets and light setup are ready.
- Keep light/shadow resources stable during playback. Do not mount/unmount lights or repeatedly toggle `castShadow` on cue changes. The existing source documents a destroyed-shadow-binding regression from this approach.
- Explicitly disable MSAA on the volume pass, then compare solid-pass MSAA on/off for visual quality and GPU time. Keep tone mapping and colour handling consistent.
- For displays above 60 Hz, offer a 60 fps submission cap so idle/active rendering does not unnecessarily chase 120/144 Hz. Do not add a competing render loop.

Acceptance: after controls settle and no visible output changes, there are no continuous scene submissions. Haze/ambient edits do not repeatedly allocate pipelines. Repeated camera sweeps do not create new shader variants after warm-up.

### 4. Cache shadow maps while preserving correctness

- Keep `castShadow` and shadow resource identities stable. Disable automatic depth-map updates and mark maps dirty explicitly.
- Dirty a light's map when its position, target, cone/projection, range, or shadow settings change. Dirty affected maps when occluders move, deform, appear, or disappear. Include gizmo movement before it is saved to React/API state.
- Camera motion and light colour/intensity changes reuse valid maps. If an off light skips updates, keep it marked dirty and refresh before its next visible contribution.
- Start with conservative invalidation of all maps on a stage-geometry edit. Add light-frustum intersection filtering only if necessary, accounting for both the old and new object bounds.
- Begin with explicit 512-square maps, tight shadow-camera ranges, and calibrated bias. Consider 256-square maps for suitable fixtures only after checking shadow edges and haze leakage. Smaller maps save work and memory but do not fix the texture-binding limit.
- Refresh moving lights on the frame that uses their new pose. Spreading active moving-light updates across frames would create stale shadows; treat that as an optional quality compromise, not a way to claim the strict target passed.

Acceptance: colour chases and camera orbits perform zero shadow-depth redraws once caches are valid. Moving an occluder or spotlight immediately updates the correct shadows in both surfaces and haze.

### 5. Share shadow storage for up to 100 spots

Replace one sampled shadow texture per spotlight with a shared depth texture array: one layer per spotlight, a stable light-to-layer mapping, and per-light matrices/bias data. A fixed-size array is a simpler first implementation than a variable-resolution atlas. Sample the same shadow data in solid and volumetric lighting.

The WebGPU baseline has 16 sampled-texture bindings per shader stage and 256 texture-array layers. One array can address many layers through one texture binding. At 100 layers, 512 x 512 x 4-byte depth storage is about 100 MiB before other attachments; 256-square layers are about 25 MiB. These are storage estimates, not total application memory or guaranteed allocations. Check the actual device limits and texture format.

First build a small comparison scene, then scale 8 -> 30 -> 60 -> 100. Preserve Three's existing material shading where possible through a custom shadow-node integration. The installed `ShadowNode` supports an array layer, and `TileShadowNode` demonstrates shared depth-array targets, but that addon splits one light's orthographic shadow view: it is not a ready-made manager for 100 independent spotlights. Resource ownership, per-layer clearing/rendering, disposal, and filtering need dedicated validation.

This step removes the binding obstacle. It does not eliminate drawing geometry from every dirty light or evaluating every light per pixel. If measurements still miss the target, proceed to step 6. Keep the eight-light path as a development comparison, not the final shadow-preserving acceptance mode.

### 6. Make lighting and LED cost depend on visible contribution

- Instance lens meshes with shared geometry/material and per-instance colour. Share or instance fixture bodies where practical, while retaining fixture selection and transform handles. Instancing reduces draw/CPU costs; it does not by itself reduce lighting calculations.
- Replace hundreds of independent analytic light shader branches with a light-data buffer and bounded loops. Keep capacity stable so changing intensity or active counts updates data, not shader source. Skip zero-output lights within this data-driven path.
- Initially reject lights by range/cone before shadow sampling. If required, build tile/cluster light lists so each surface fragment evaluates only lights that can affect it. Start with conservative CPU lists for this scale if profiling supports them; use GPU list construction only when justified.
- Apply equivalent culling to haze. A haze ray sample needs lights for its own 3D position, not merely the visible surface behind it. Handle per-cluster list overflow without silently dropping lights or shadows; test 100 overlapping beams as a worst case.
- Keep all individual LED colours visible. For light cast onto the environment, exact per-head evaluation belongs in the shared buffered/culling path. Grouping similar nearby heads into a few representative emitters may be an optional approximation, but averaging an entire RGB chase changes its appearance and must not be the default correctness fix.
- Multi-head lights currently use `RectAreaLight`, which has no built-in shadows. A physically broad area source and a spotlight shadow are not interchangeable. Treat shadowed LED spill as a separate fidelity decision: a shared/group shadow can approximate nearby emitters, whereas exact independent shadows for every spatially separated head add unavoidable cost. Do not quietly replace these with unshadowed lights.
- Retain the existing quarter-resolution haze initially. Only if needed, evaluate depth-aware upsampling or temporal reuse after the main bottlenecks are fixed; validate disocclusion and moving-beam ghosting. Avoid beginning with a complex temporal renderer.

At 960 x 540, 100 globally evaluated lights imply roughly 51.8 million surface light evaluations for a full-screen shaded surface. The current 240 x 135 haze with 12 steps adds up to roughly 38.9 million light-step evaluations if fully covered. These are illustrative work counts before filtering and rejection, not measured GPU instructions. They explain why shared shadow storage alone is insufficient.

Installed-version caution: `ClusteredLightsNode.setLights()` in Three.js 0.186 only clusters unshadowed point lights. `DynamicLightsNode` excludes shadow-casting lights and does not batch rect-area lights. Neither is a drop-in solution for this app. Newer online documentation must not substitute for inspecting the installed implementation.

## Acceptance and delivery

Deliver in small changes: baseline harness; effect scheduler/caches; frame-loop and haze lifecycle; shadow caching; shared shadow storage prototype; then LED instancing and buffered/culling lighting as required by measurements. Keep output comparisons after each stage.

| Test | Required result |
| --- | --- |
| Static scene, camera at rest | No continuous scene or shadow rendering after settling. |
| Camera orbit, 100 fixed shadowed spots | All shadows remain correct; no shadow-depth updates from camera movement alone; stable 60 fps on the chosen integrated GPU at the agreed resolution/quality. |
| Colour/intensity fades across 100 fixed spots | 60 Hz visible updates; cached shadow depths reused; no React page render per animation frame. |
| 1, 10, then 100 moving spots; moving occluders | Correct current-pose shadows; report separately where the 16.67 ms frame budget is exceeded. |
| 64 / 256 / 1024 LED heads | Record CPU/GPU deltas, visible per-head pattern correctness, and draw-call growth. Exact independent illumination is not expected to be literally free. |
| Cold load, new fixtures, selections, haze toggles | Compilation/allocation occurs during controlled preparation; warmed ordinary interaction does not continually build pipelines. |
| Ten-minute mixed playback and repeated navigation | No growing resource counts, persistent binding errors, device-loss regressions, or worsening effect timing. |

For the 60 fps goal, track p95/p99 frame gaps and missed-refresh counts as well as average FPS. Aim for p99 application CPU/GPU work below 16.67 ms with headroom, and report any presentation misses; averages alone cannot demonstrate the user's minimum-fps request. Browser/OS scheduling makes an unconditional zero-drop guarantee inappropriate. A particular integrated GPU must pass the actual benchmark before claiming the target achieved.

All-active, heavily overlapping, independently moving 100-light scenes may exceed laptop integrated graphics even after optimization. Report that limit explicitly rather than hiding it by disabling shadows, reducing resolution below the requested half scale, or leaving stale moving shadows.

## Reference APIs

- [Three.js LightShadow](https://threejs.org/docs/pages/LightShadow.html): explicit shadow update controls.
- [Three.js Renderer](https://threejs.org/docs/pages/Renderer.html): asynchronous shader compilation; verify exact behavior against installed source.
- [R3F on-demand rendering and instancing](https://r3f.docs.pmnd.rs/advanced/scaling-performance).
- [R3F animation performance guidance](https://r3f.docs.pmnd.rs/advanced/pitfalls).
- [WebGPU limits](https://gpuweb.github.io/gpuweb/#limits).
- [Three.js RectAreaLight limitations](https://threejs.org/docs/pages/RectAreaLight.html).
