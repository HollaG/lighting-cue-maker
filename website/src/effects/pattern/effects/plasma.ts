import { definePatternEffect, type Rgb } from "../patternEffect";
import { perlinNoise } from "../perlinNoise";

// Based on QLC+'s "Plasma" RGB script (resources/rgbscripts/plasma.js): 3D Perlin noise, where x/y are the cell
// and z is time, mapped onto a looping colour gradient.
//
// Differences from QLC+:
//   - "User defined" uses the LD's 2 colours (QLC+ takes up to 5).
//   - Default preset is Rainbow (QLC+: User defined), because the default colours here are white.
//   - QLC+ moves z on every frame it draws; here z moves by "Speed" every step, so a shorter step duration
//     makes it smoother.

/** Gradient steps between two neighbouring colours, as in QLC+. */
const GRADIENT_STEPS = 300;
/** z where QLC+ starts. */
const START_Z = 100;
/** The noise repeats every 256 along z, so travelling 256 is a seamless loop. */
const NOISE_PERIOD = 256;

const PRESETS: Record<string, Rgb[]> = {
  rainbow: [
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
  ],
  fire: [
    [255, 255, 0],
    [255, 0, 0],
    [0, 0, 64],
    [255, 0, 0],
  ],
  abstract: [
    [85, 113, 255],
    [0, 255, 255],
    [255, 0, 255],
    [255, 255, 0],
  ],
  ocean: [
    [0, 58, 185],
    [2, 234, 255],
  ],
};

/** How far z moves per step. Same curve as QLC+: 100^(speed / 50) / 500. */
const zPerStep = (speed: number) => Math.pow(100, speed / 50) / 500;

export default definePatternEffect({
  id: "plasma",
  name: "Plasma",
  description:
    "Smooth, flowing blobs of colour. Pick a preset, or \"User defined\" to use your 2 colours. " +
    "Use a short step duration (e.g. 50 ms) for smooth movement.",
  colourCount: 2,
  params: [
    {
      type: "list",
      id: "preset",
      label: "Preset",
      options: ["rainbow", "fire", "abstract", "ocean", "user defined"],
      default: "rainbow",
    },
    { type: "range", id: "size", label: "Size", min: 1, max: 20, default: 5 },
    { type: "range", id: "ramp", label: "Ramp", min: 10, max: 30, default: 20 },
    { type: "range", id: "speed", label: "Speed", min: 1, max: 50, default: 25 },
  ],
  // One full trip around the noise's z period, so the loop joins up.
  stepCount: ({ params }) => Math.max(1, Math.round(NOISE_PERIOD / zPerStep(params.speed))),
  colourAt: ({ col, row, cols, rows, step, colours, params }) => {
    const palette = params.preset === "user defined" ? colours : PRESETS[params.preset];
    const square = Math.max(cols, rows); // keeps blobs round on non-square grids
    const size = params.size / 2;
    const z = (START_Z + (step + 1) * zPerStep(params.speed)) % NOISE_PERIOD;

    const n = noise((size * col) / square, (size * row) / square, z); // 0–1
    const gradientLength = palette.length * GRADIENT_STEPS;
    const index = Math.min(gradientLength - 1, Math.round(Math.pow(n, params.ramp / 10) * gradientLength));
    return gradientAt(palette, index);
  },
});

/** Colour `index` of the looping gradient through `palette` (each pair split into GRADIENT_STEPS, last → first). */
const gradientAt = (palette: Rgb[], index: number): Rgb => {
  const pair = Math.floor(index / GRADIENT_STEPS);
  const s = index % GRADIENT_STEPS;
  const from = palette[pair];
  const to = palette[(pair + 1) % palette.length];
  const channel = (i: number) => Math.floor(from[i] + ((to[i] - from[i]) / GRADIENT_STEPS) * s);
  return [channel(0), channel(1), channel(2)];
};

/** 3D Perlin noise, scaled to 0–1. */
const noise = (x: number, y: number, z: number): number =>
  Math.min(1, Math.max(0, (1 + perlinNoise(x, y, z)) / 2)); // clamp: a negative value would make Math.pow give NaN
