# Visualiser optimization: what was wrong and how it was fixed

Written 15 November 2026. Covers the work on branch `optimize/visualiser-claude`: the 3D visualiser in `src/components/Visualiser3D-v2` and the pattern-effect code that feeds it.

The original plan, with the reasoning behind each step and the acceptance tests, is in [optimizations/visualiser-claude.md](optimizations/visualiser-claude.md). This document is the record of what was actually done.

## Summary

The visualiser had four separate problems. Each had its own cause and its own fix.

| Problem | Cause | Fix |
| --- | --- | --- |
| Pattern effects stuttered while the camera stayed smooth | Effects ran on a timer through React state, outside the render loop | Effects are played inside the canvas, once per drawn frame, with no React render |
| The GPU worked all the time, even on a still scene | The canvas drew at the screen's refresh rate whether or not anything changed | The canvas draws only when something changes, at most 60 times a second |
| Many lights froze, blacked out or crashed the scene | Every light was a separate three.js light, so every light added shader code and every shadow added a texture | All lights are rows in one data texture, read by one loop in the shader. All shadows share one texture array |
| LED bars with many heads were very expensive | Every head was its own mesh, its own material and its own area light | Heads are rows in the same light table, and all lenses are drawn as two instanced meshes |

Result on the development machine (NVIDIA GPU, 165 Hz screen, production build, 1/3 resolution scale) with the heaviest test scene: 100 shadow-casting spots, 1024 LED heads, haze, a fade effect and a moving camera.

| | Value |
| --- | --- |
| Drawn frames | 60.1 per second (the cap), no stall over 25 ms |
| GPU time per frame | 1.3 ms (about 10% GPU usage) |
| CPU time per frame | 2.7 ms |
| Draw calls per frame | 179 |
| Effect updates | 60.1 per second, with 0 React commits |
| Shader builds during the run | 0 |

Before this work the same scene could not be drawn at all: the shader failed to build at 1024 LED heads, and more than 8 shadowed spots turned the scene black.

**Not yet measured:** integrated graphics, which is the target hardware. See [Still open](#still-open).

## 1. Measuring: the bench

**Why.** Without numbers there was no way to say whether a change helped, or whether a goal was met.

**What was built.** A page at `/dev/visualiser-bench` with fixed test scenes (8 to 100 spots, 0 to 1024 LED heads), a live readout over the canvas and a 10-second recorder that produces a text report. It uses the same `StagePreview3D` scene as the real pages, so it measures the real code.

The report includes frame gaps (median, p95, p99, worst), CPU and GPU time per frame, draw calls, shader builds, shadow redraws, effect updates and React commits. GPU time comes from WebGPU timestamp queries, so it is the real time on the GPU, not the time the CPU spent submitting work.

The bench can also switch back to the old lighting ("three.js lights (old)") for a side-by-side comparison.

Code: [Bench/](../src/components/Visualiser3D-v2/Bench/).

## 2. Pattern effects stuttered

**What went wrong.**

- An effect's clock was a `setTimeout` that stored the time in React state on the event page (`useEffectClock`).
- Every tick re-rendered the whole event page, recalculated every fixture's DMX values, and pushed new arrays through every fixture component. Each fixture then decoded its DMX again and parsed colour strings.
- This ran separately from the render loop. When rendering was busy, React's updates were delayed, so the effect skipped steps while the camera still moved smoothly.
- Fades ticked 30 times a second, so a 60 fps canvas could show at most about 29 effect updates a second.
- A scheduling bug: when one pattern was fading, the next step of another pattern could be missed.
- Each tick rebuilt lookup maps (fixtures, templates, channels) from scratch.

**How it was fixed.**

- A pattern is now compiled once, when the cue or setup changes, into a *player*: [patternPlayer.ts](../src/effects/pattern/patternPlayer.ts). All lookups are done at compile time. A step's colours are calculated once when the step starts; during a fade the player only interpolates between the previous and the current step.
- The player is run inside the canvas by [PatternEffectRunner.tsx](../src/components/Visualiser3D-v2/PatternEffectRunner.tsx), just before each frame is drawn. It calculates the state for the current time; after a slow frame it does not replay missed ticks.
- The values are written straight to each fixture's lenses and lights through a registry ([headSinks.ts](../src/components/Visualiser3D-v2/Elements/headSinks.ts)). There is no React state per frame, so the event page no longer re-renders during an effect.
- Overrides are compiled to a list of patches, and each fixture's DMX decoder is built once per template and mode and cached.
- `useEffectClock` was deleted. `useResolvedDmx` now returns the static values plus the compiled playback.
- The pattern preview in Step 5 (`PatternPreview`) uses the same player through a small frame helper ([effectFrames.ts](../src/effects/effectFrames.ts)), so there is one copy of the timing code. The scheduling bug is fixed in it.

The old functions (`applyPatternEffects` and friends) remain as thin wrappers around the player, and the existing tests still pass against them. Eight new tests cover the player.

**Measured.** A fade went from about 29 effect updates and 29 React commits per second to 60 updates and 0 commits.

## 3. The GPU worked when nothing changed

**What went wrong.**

- Both canvases used the default continuous loop, so a still scene was drawn at the screen's refresh rate (165 times a second on the development screen).
- Every shadow map was redrawn every frame, even when no light or object had moved.
- The haze pipeline was destroyed and rebuilt whenever the environment object changed, so every step of the haze or ambient slider reallocated render targets and rebuilt shaders.
- Haze ran its full ray-march and blur even at zero strength, then multiplied the result by zero.
- The haze pass used 4× MSAA, which is wasted on a pass that is blurred afterwards.

**How it was fixed.**

- Both canvases use `frameloop="demand"`: a frame is drawn only after something asks for one. The camera controls ask while the camera moves. The effect player asks every frame during a fade, and sets one timed wake-up for the next step during a hold. Changes in the lil-gui panels ask through [InvalidateOnGuiChange.tsx](../src/components/Visualiser3D-v2/InvalidateOnGuiChange.tsx).
- A frame gate caps drawing at 60 fps ([frameGate.ts](../src/components/Visualiser3D-v2/frameGate.ts)). On a frame that is skipped, the effect player and the draw are both skipped.
- The haze pipelines are built once. Haze strength is a shader value, so the slider changes a number instead of rebuilding anything. At zero haze a solid-only pipeline is used, which skips the ray-march and blur. MSAA is off on the haze pass.
- Shadows are redrawn only when needed (see the next section).

**Measured.** A still scene went from 165 draws a second to 0. A camera orbit went from 165 to 60.

**The 60 fps cap.** It is deliberate, to keep GPU use low on laptops. On a screen whose refresh rate is not a multiple of 60 (such as 165 Hz), frames alternate between about 12 ms and 18 ms apart, which can show as slight judder when orbiting. Changing the cap to an even division of the refresh rate would fix that; it has not been done.

## 4. Many lights froze, blacked out or crashed the scene

**What went wrong.** Every fixture head was a separate three.js light. That had three consequences.

- **Freezes.** three.js generates a block of shader code per light, and builds a mesh's shader the first time the mesh comes into view. With many lights each build was slow, so the scene froze when the camera first turned towards a new area. Adding, removing or toggling a light changed the shader, so everything was rebuilt.
- **Black scene.** Each shadow-casting light was its own texture in every lit shader, and WebGPU allows 16 textures per shader. That is why the editor was capped at 8 shadows and the viewer had none. 30 shadowed lights turned the scene black.
- **Crash.** At 1024 LED heads the generated shader was too large to build at all. At 256 it took about a minute and a half to load.

**How it was fixed: the light table.**

- Every head light is now a few rows of numbers in one data texture: position and reach, direction and cone, colour × intensity, and a shadow layer number. [LightTable.ts](../src/components/Visualiser3D-v2/LightTable/LightTable.ts).
- One loop in the shader reads the table: [LightTableNode.ts](../src/components/Visualiser3D-v2/LightTable/LightTableNode.ts). The same loop lights the solid surfaces and the haze.
- For each pixel and light, the loop first checks reach, then the cone. Only a light that passes both is shaded. Most lights fail for most pixels, and each check is cheap.
- Lights that are off are left out when the table is packed, so the shader never visits them. This makes chases cheap.
- Adding, removing or switching a light now changes data, never shader code. Nothing is rebuilt when lights change or when the camera turns.
- The table is installed as the renderer's lighting (`renderer.lighting`), so no material had to change. It is on by default in [visualiser3DRenderer.ts](../src/components/Visualiser3D-v2/visualiser3DRenderer.ts).

**How it was fixed: shared shadows.**

- All shadows live in one depth texture array, one layer per shadow-casting spot: [ShadowLayers.ts](../src/components/Visualiser3D-v2/LightTable/ShadowLayers.ts). One array counts as one texture, so the 16-texture limit no longer applies.
- Every single-head fixture now casts a shadow, in the editor and in the viewer.
- A layer is redrawn only when its light moves or its cone changes. All layers are redrawn when a stage object moves, appears or disappears. Camera movement and colour changes redraw nothing.
- At most 32 layers are redrawn per frame. A larger change (loading 100 spots) finishes over the next few frames.
- The array starts at 8 layers and doubles as fixtures are added, up to 256. A layer is 512 × 512, about 1.3 MB.

**Measured.**

| | Before | After |
| --- | --- | --- |
| 100 shadowed spots | black scene | 60 fps, GPU about 1 ms |
| 100 spots + 64 LED heads: time to first frame | 5.7 s | 0.2 s |
| 256 LED heads | about 1.5 minutes to load | loads at once |
| 1024 LED heads | shader fails to build | 60 fps |
| Shadow redraws per frame while the camera moves | 8 | 0 |
| First camera sweep after load | freezes on each new area | 0 shader builds, no frame over 6.4 ms |

Because nothing is built when the camera turns any more, the planned warm-up step was not needed and was dropped.

## 5. LED bars were expensive

**What went wrong.** Each LED head was its own lens mesh with its own material (one draw call per head) and its own `RectAreaLight`, one of the most expensive light types per pixel. Heads that were off still stayed mounted as lights.

**How it was fixed.**

- Each head is a cone in the light table, like a small spot. It keeps its own colour on the floor and in the haze, so chases still read correctly.
- All lenses in a canvas are drawn as two instanced meshes, one for round lenses and one for square ones: [LensInstances.ts](../src/components/Visualiser3D-v2/Elements/LensInstances.ts). A 1024-head scene went from 1024 lens draw calls to one.

**A look change to know about.** LED heads used to be area lights and are now cones. The on-axis brightness matches (intensity × lens area), but the shape of the light on the floor is slightly different. `LED_HEAD_GAIN` in [Visualiser3DFixture.tsx](../src/components/Visualiser3D-v2/Elements/Visualiser3DFixture.tsx) scales the brightness.

## Bugs found along the way

These appeared after the switch to the light table and draw-on-demand. Each is fixed; they are recorded because the causes are not obvious from the code alone.

**The last few light pools stayed dark until the camera moved.** With 100 spots, the last four had no light on the floor until something caused another frame. three.js was using a changed data texture one draw late, which nobody notices when drawing continuously but which shows with draw-on-demand. Fix: the table and shadow-matrix textures are uploaded explicitly (`renderer.initTexture`) when they change. The reason three.js is late was not found.

**On the event page the scene froze after "preview cue", but the haze kept moving.** Every solid draw was failing with `Destroyed texture "LightTableShadowDepth" used in a submit`. Materials bind the shadow array as soon as they draw, even with every light off. The array was first set up later, at the first shadow redraw, which made three.js recreate the texture and left the materials holding the destroyed one. Fix: the shadow array is set up before the first draw (`ShadowLayers.prepare`).

**After that fix, the floor and objects stayed unlit when a cue's lights came on, while the haze was lit.** The light count was a per-object shader value. three.js gives each object its own copy of such a value but one shared record of what was last uploaded, so after a change only the first object drawn received it. Every other object kept the count it started with, which was 0 on a page loaded with no cue. Fix: the count and the shadow bias are in three's shared render group (`renderGroup`). **Any value that is the same for all objects must go there.**

## What was left alone

- **MSAA on the solid pass** is still on. The bench has a toggle to compare.
- **The old lighting path** still exists behind `lightTable: false` on the renderer factory. Only the bench uses it, for comparison.
- **Pixel strips** (`bar_pixel`) are still one light per pixel. Showing them as lenses only, or lenses plus one soft wash per fixture, was discussed and put off as a look change.

## Still open

- **Integrated graphics has not been measured.** It is the target hardware, at 1/4 resolution scale. The part most likely to be slow there is the per-pixel light loop, which the haze also runs at every step along its ray. If it falls short, the options in order of effort are: turn MSAA off, use smaller shadow maps, show pixel strips as lenses only, and cull lights per screen region.
- **Editor interactions under draw-on-demand** (dragging a fixture, dragging a cuboid or human, editing values in the side panel) have been checked only lightly.
- **Pan and tilt are not decoded yet.** When they are, a moving head will redraw its shadow layer every frame, and the cap of 32 redraws per frame will start to matter.
- **`npm run build` fails** on two unused variables in the timeline code (`TimelineRuler.tsx`, `timeline.ts`), which this work did not touch. `npx vite build` works.
