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

This is the largest change, so it is explained in more detail than the others.

### Background: how three.js normally handles lights

Two facts about three.js explain all three symptoms.

**A shader is written per light list.** A shader is the small program the GPU runs for every pixel of a surface. three.js writes that program itself, from the material and from the lights in the scene. For every light it adds a block of code: "work out light 1", "work out light 2", and so on. So the program's text depends on which lights exist, and it is as long as the light list.

Turning that text into something the GPU can run (compiling it) takes from a few milliseconds to several seconds, depending on its length. three.js does it the first time a mesh is drawn, and the page waits while it happens.

**A shadow is a picture taken from the light.** To know whether a point is in shadow, three.js first draws the scene from the light's position and keeps only the depth: how far the nearest surface is in each direction. That picture is the light's *shadow map*. Later, when a pixel on the floor is shaded, its distance to the light is compared with the depth stored for that direction. If the pixel is farther away than the stored depth, something is in between, and the pixel is in shadow.

Every shadow-casting light needs its own shadow map, and in three.js each map is a separate texture handed to every lit shader.

### What went wrong

- **Freezes.** A mesh's shader is compiled when the mesh first comes into view, and with many lights each compile was slow. So the scene froze each time the camera first turned towards a new area. Adding, removing or toggling a light changed the light list, so every shader was thrown away and compiled again.
- **Black scene.** WebGPU allows a shader to read 16 textures. With one shadow map per light, that limit is reached quickly. This is why the editor was capped at 8 shadows and the viewer had none; 30 shadowed lights turned the scene black. Smaller shadow maps would not have helped, because the limit is on the number of textures, not their size.
- **Crash.** At 1024 LED heads the shader text was too large to compile at all, and nothing was drawn. At 256 heads it took about a minute and a half.

All three come from the same design: the *number of lights* was built into the *shader code*.

### The idea

Take the lights out of the shader code and put them in data.

The shader contains one loop that says "for each light in the table, work out its contribution". The table is a block of numbers the shader reads. Ten lights or a thousand, the shader text is the same, so it is compiled once and never again.

### The light table

Code: [LightTable.ts](../src/components/Visualiser3D-v2/LightTable/LightTable.ts).

The table is a texture used as a spreadsheet instead of a picture. It is 2048 cells wide and 4 cells high, and every cell holds four numbers. One column is one light:

| Row | The four numbers |
| --- | --- |
| 0 | Position (x, y, z) and reach in metres |
| 1 | Direction of the beam (x, y, z) and how wide the cone is |
| 2 | Colour × intensity (red, green, blue) and where the soft edge starts |
| 3 | Which shadow layer the light uses, or −1 for no shadow |

Details that matter:

- **Each fixture head owns a small `TableLight` object** with the same fields a three.js light has (`color`, `intensity`). The fixture and the effect player write to it exactly as they used to write to a `SpotLight`.
- **The table is packed once per drawn frame.** The packer walks over all `TableLight` objects and writes the lit ones into columns 0, 1, 2 and so on. A separate number, the *count*, tells the shader how many columns are filled.
- **Lights that are off are not written.** A light with zero intensity or a black colour takes no column, so the shader never looks at it. In a chase where 4 of 64 heads are lit, the shader loops over 4 lights, not 64.
- **Positions are in world space**, not relative to the camera. So the numbers change only when a light moves or changes colour. Moving the camera changes nothing in the table.
- **The texture is sent to the GPU only when a number changed.** A still scene uploads nothing.

### The loop in the shader

Code: [LightTableNode.ts](../src/components/Visualiser3D-v2/LightTable/LightTableNode.ts).

For every pixel, the shader runs this:

```
for each filled column of the table:
    read row 0 (position, reach)
    if the pixel is farther away than the reach: skip this light

    read row 1 (direction, cone)
    if the pixel is outside the cone: skip this light

    read row 2 (colour)
    dim the colour towards the cone's edge and with distance

    read row 3 (shadow layer)
    if the light has a shadow layer:
        look up the shadow, and dim the colour if the pixel is in shadow

    give the colour and direction to the material's normal lighting maths
```

The two "skip" lines are what make it fast. A stage spot lights a small circle on the floor. For any one pixel, nearly every light fails the reach test or the cone test, and each test is a couple of multiplications. Only the few lights that really reach the pixel get the expensive part: the shadow lookup and the material's lighting maths.

The last line hands over to three.js's own material code. The floor, the cuboids and the humans are still ordinary `MeshStandardMaterial`s and look the same as before; only the source of the light changed.

### How it is plugged in

three.js lets a renderer replace its whole lighting system through `renderer.lighting`. The visualiser's renderer sets it to `LightTableLighting`, which gives every material two things: the scene's ordinary lights (only the ambient light is left) and the table loop. No material had to be changed. This is on by default in [visualiser3DRenderer.ts](../src/components/Visualiser3D-v2/visualiser3DRenderer.ts).

**The haze uses the same loop.** The haze is drawn by walking along a ray from the camera through each pixel and asking, at each step, "how much light is at this point in the air?". three.js's haze code asks the scene's lighting, which is now the table loop. So beams are visible in the haze, and objects cut shadows through the beams, with no extra code. The cost is that the loop runs once per step of the ray, not once per pixel, which is why the haze is drawn at a lower resolution.

### Shadows: one stack instead of many textures

Code: [ShadowLayers.ts](../src/components/Visualiser3D-v2/LightTable/ShadowLayers.ts).

A *texture array* is a stack of same-sized images that the GPU counts as a single texture. All shadow maps now live in one such stack, one layer per shadow-casting spot. The shader reads one texture however many spots there are, so the 16-texture limit no longer applies.

- **Each spot keeps the same layer** for as long as its fixture exists. Row 3 of the light table holds the layer number.
- **A second small table holds one matrix per layer.** The matrix is what converts a point in the scene into "which pixel of this light's shadow map, and how far from the light". The shader reads it, converts the pixel's position, and asks the GPU to compare against the stored depth.
- **Every single-head fixture casts a shadow now**, in the editor and in the viewer. LED heads still cast none, as before.

**When a layer is redrawn.** Drawing a shadow map means drawing the scene again from that light, so it is the most expensive thing a light can ask for. A layer is redrawn only when its picture would be different:

| What happened | What is redrawn |
| --- | --- |
| The camera moved | Nothing |
| A light changed colour or intensity | Nothing |
| A light moved, or its cone changed | That light's layer |
| A stage object moved, appeared, disappeared or changed shape | Every layer |
| A light is off | Nothing: its layer waits until the light comes on |

"Every layer" for a moved object is more than strictly needed, since an object only affects the lights that reach it. It is simple and safe, and objects only move while editing.

**Limits and memory.**

- At most 32 layers are redrawn in one frame, so a big change cannot stall a frame. Loading 100 spots takes four frames to finish; a light whose layer is still waiting is drawn a frame or two late.
- The stack starts with 8 layers and doubles when it is full, up to 256. A layer is 512 × 512 pixels, about 1.3 MB, so 100 spots use about 170 MB at the 128-layer size. Growing the stack makes a new, empty one, so every layer is redrawn once.

### What happens on each drawn frame

In order, before the scene itself is drawn ([LightTableUpdater.tsx](../src/components/Visualiser3D-v2/LightTable/LightTableUpdater.tsx)):

1. The effect player writes this frame's colours into the `TableLight` objects.
2. The positions of everything in the scene are brought up to date.
3. The light table is packed, and uploaded if any number changed.
4. The shadow-casting objects are checked for movement.
5. The layers that need it are redrawn, up to 32.
6. The scene is drawn, then the haze.

### What it costs

- **Every pixel still loops over every lit light.** The tests are cheap, but with a thousand lights lit it is a thousand tests per pixel, and more in the haze. On the development machine this is 1.3 ms. On integrated graphics it is the part most likely to be slow. The known next step is to split the screen into regions and give each region a short list of the lights that reach it.
- **The table only knows cone lights.** A new kind of light (a point light, a true area light) would need new rows and new code in the loop.
- **Fixed sizes.** 2048 lights lit at once and 256 shadows. Beyond that, extra lights are dark and a warning is logged.

### Measured

| | Before | After |
| --- | --- | --- |
| 100 shadowed spots | black scene | 60 fps, GPU about 1 ms |
| 100 spots + 64 LED heads: time to first frame | 5.7 s | 0.2 s |
| 256 LED heads | about 1.5 minutes to load | loads at once |
| 1024 LED heads | shader fails to build | 60 fps |
| Shadow redraws per frame while the camera moves | 8 | 0 |
| First camera sweep after load | freezes on each new area | 0 shader builds, no frame over 6.4 ms |

Because nothing is compiled when the camera turns any more, the planned warm-up step was not needed and was dropped.

## 5. LED bars were expensive

An LED bar has many heads: the bench's bars have 16 each, and 64 bars is 1024 heads. Each head has two parts that cost something: the *lens* you see on the fixture, and the *light* it throws on the stage.

### What went wrong

- **The light.** Each head was a `RectAreaLight`, a light shaped like a glowing rectangle. It is the most expensive light type three.js has: for every pixel it does several texture lookups and a long calculation to work out how much of the rectangle the pixel can see. It was also one more block of shader code per head, which is the problem from section 4.
- **The lens.** Each head's lens was its own mesh with its own material. The GPU is told about each mesh separately (one *draw call* each), and each call has a fixed cost on the CPU however small the mesh is. 1024 heads meant 1024 draw calls for some small rectangles.
- **Heads that were off still cost the same.** They stayed in the scene as lights with zero intensity, so the shader still worked through them.

### The light: a cone in the table

Each head is now one column of the light table from section 4: a cone pointing out of the lens, with the fixture's beam angle.

- **Every head keeps its own colour** on the floor and in the haze. A chase along a bar still shows as separate moving pools of light. (An earlier idea, one averaged light per bar, would have lost that.)
- **Brightness matches the old light.** An area light's brightness depends on its size, so a head's intensity is multiplied by its lens area. `LED_HEAD_GAIN` in [Visualiser3DFixture.tsx](../src/components/Visualiser3D-v2/Elements/Visualiser3DFixture.tsx) scales it further if the heads look too dim.
- **Heads that are off cost nothing**, because off lights are not packed into the table.
- **No shadows**, as before. Only single-head fixtures cast them.

**A look change to know about.** A glowing rectangle and a cone do not light the floor in quite the same shape: the rectangle gave a soft wash, the cone gives a pool with an edge. Straight below the head the brightness is the same.

### The lens: instancing

Code: [LensInstances.ts](../src/components/Visualiser3D-v2/Elements/LensInstances.ts).

*Instancing* is a way to tell the GPU "draw this same shape N times" in one draw call. Along with the shape, the GPU is given a list with one entry per copy: where to put it and what colour to make it.

- **There are two instanced meshes per canvas**: one for round lenses (spots) and one for square lenses (LED heads). Every lens of every fixture is an entry in one of the two lists.
- **Each fixture registers a small `Lens` object per head**, holding its colour and its place on the fixture. The effect player writes the colour exactly as it used to write to a lens material.
- **Once per drawn frame the lists are refreshed.** Each lens's place in the scene and its colour are copied into the lists, and a list is sent to the GPU only if something in it changed. A lens follows its fixture when the fixture is dragged.
- **The lens colour** is dark grey when the head is off and moves towards the head's colour as its intensity rises. Lenses are not affected by the scene's lights; they simply show their colour.
- **The lists grow by doubling**, starting at 64 entries.
- **Lenses do not take clicks.** Clicking a fixture selects it through its body, as before.

### Measured

- A 1024-head scene went from 1024 lens draw calls to 1.
- 100 spots plus 1024 LED heads: 179 draw calls in total, about 2.5 ms of CPU per frame. Most of the 179 are the fixture bodies and stage objects.

## Bugs found along the way

These appeared after the switch to the light table and draw-on-demand. Each is fixed; they are recorded because the causes are not obvious from the code alone.

**The last few light pools stayed dark until the camera moved.** With 100 spots, the last four had no light on the floor until something caused another frame. three.js was using a changed data texture one draw late, which nobody notices when drawing continuously but which shows with draw-on-demand. Fix: the table and shadow-matrix textures are uploaded explicitly (`renderer.initTexture`) when they change. The reason three.js is late was not found.

**On the event page the scene froze after "preview cue", but the haze kept moving.** Every solid draw was failing with `Destroyed texture "LightTableShadowDepth" used in a submit`. Materials bind the shadow array as soon as they draw, even with every light off. The array was first set up later, at the first shadow redraw, which made three.js recreate the texture and left the materials holding the destroyed one. Fix: the shadow array is set up before the first draw (`ShadowLayers.prepare`).

**After that fix, the floor and objects stayed unlit when a cue's lights came on, while the haze was lit.** The light count was a per-object shader value. three.js gives each object its own copy of such a value but one shared record of what was last uploaded, so after a change only the first object drawn received it. Every other object kept the count it started with, which was 0 on a page loaded with no cue. Fix: the count and the shadow bias are in three's shared render group (`renderGroup`). **Any value that is the same for all objects must go there.**

## What was left alone

- **MSAA on the solid pass** is still on. MSAA (multisample anti-aliasing) smooths the jagged, stair-stepped edges of objects by checking four points inside each pixel along an edge instead of one. It costs GPU memory and some time, and three.js turns it on at 4× by default. It was removed from the haze pass, where the blur hides it anyway, and kept on the solid pass, where edges are visible. The bench has a toggle to compare.
- **The old lighting path** still exists behind `lightTable: false` on the renderer factory. Only the bench uses it, for comparison.
- **Pixel strips** (`bar_pixel`) are still one light per pixel. Showing them as lenses only, or lenses plus one soft wash per fixture, was discussed and put off as a look change.

## Still open

- **Integrated graphics has not been measured.** It is the target hardware, at 1/4 resolution scale. The part most likely to be slow there is the per-pixel light loop, which the haze also runs at every step along its ray. If it falls short, the options in order of effort are: turn MSAA off, use smaller shadow maps, show pixel strips as lenses only, and cull lights per screen region.
- **Editor interactions under draw-on-demand** (dragging a fixture, dragging a cuboid or human, editing values in the side panel) have been checked only lightly.
- **Pan and tilt are not decoded yet.** When they are, a moving head will redraw its shadow layer every frame, and the cap of 32 redraws per frame will start to matter.
- **`npm run build` fails** on two unused variables in the timeline code (`TimelineRuler.tsx`, `timeline.ts`), which this work did not touch. `npx vite build` works.
