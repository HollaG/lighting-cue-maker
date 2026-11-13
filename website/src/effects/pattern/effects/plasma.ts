import { definePatternEffect, type Rgb } from "../patternEffect";

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

// --- Ken Perlin's improved noise, as in the QLC+ script ---------------------------------------------------

// prettier-ignore
const PERMUTATION = [
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240,
  21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88,
  237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83,
  111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80,
  73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
  52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182,
  189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22,
  39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210,
  144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84,
  204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78,
  66, 215, 61, 156, 180,
];
const P = [...PERMUTATION, ...PERMUTATION]; // doubled, so P[i + 1] never runs off the end

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (t: number, a: number, b: number) => a + t * (b - a);
const grad = (hash: number, x: number, y: number, z: number) => {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
};

/** 3D Perlin noise, scaled to 0–1. */
const noise = (x: number, y: number, z: number): number => {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);
  const A = P[X] + Y;
  const AA = P[A] + Z;
  const AB = P[A + 1] + Z;
  const B = P[X + 1] + Y;
  const BA = P[B] + Z;
  const BB = P[B + 1] + Z;
  const raw = lerp(
    w,
    lerp(
      v,
      lerp(u, grad(P[AA], x, y, z), grad(P[BA], x - 1, y, z)),
      lerp(u, grad(P[AB], x, y - 1, z), grad(P[BB], x - 1, y - 1, z)),
    ),
    lerp(
      v,
      lerp(u, grad(P[AA + 1], x, y, z - 1), grad(P[BA + 1], x - 1, y, z - 1)),
      lerp(u, grad(P[AB + 1], x, y - 1, z - 1), grad(P[BB + 1], x - 1, y - 1, z - 1)),
    ),
  );
  return Math.min(1, Math.max(0, (1 + raw) / 2)); // clamp: a negative value would make Math.pow give NaN
};
