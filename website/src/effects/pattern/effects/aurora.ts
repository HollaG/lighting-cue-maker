import { definePatternEffect, type Rgb } from "../patternEffect";
import { perlinNoise } from "../perlinNoise";

// Based on QLC+'s "Aurora" RGB script (resources/rgbscripts/aurora.js): slow-drifting bands of colour from 3D
// Perlin noise, sampled from a dark-to-light palette, a bit dimmer at the top and bottom rows.
// Only in QLC+ 5.3 and later.
//
// Differences from QLC+:
//   - Always uses QLC+'s default teal palette. QLC+ takes up to 5 colours from the user instead, but here colours
//     only come from the LD's pickers, which don't exist yet (and could hold 2 at most).
//
// Like QLC+, the loop is 64 steps and the noise doesn't line up at the end, so there's a jump when it repeats.

/** QLC+'s default palette: 0x001018, 0x003048, 0x106070, 0x40B0A0, 0xA0FFE0. */
const PALETTE: Rgb[] = [
  [0, 16, 24],
  [0, 48, 72],
  [16, 96, 112],
  [64, 176, 160],
  [160, 255, 224],
];

export default definePatternEffect({
  id: "aurora",
  name: "Aurora",
  description: "Slow-drifting bands of teal and green, like the northern lights. Makes its own colours.",
  colourCount: 0,
  params: [
    { type: "range", id: "speed", label: "Speed", min: 1, max: 50, default: 15 },
    { type: "range", id: "scale", label: "Scale", min: 4, max: 60, default: 20 },
    { type: "range", id: "contrast", label: "Contrast", min: 0, max: 100, default: 80 },
  ],
  stepCount: () => 64,
  colourAt: ({ col, row, rows, step, params }) => {
    const t = step * (params.speed / 300);
    const scale = params.scale / 50; // bigger = larger bands

    const noise = (perlinNoise(col * scale * 0.8, row * scale * 0.8 + t * 0.7, t * 0.2) + 1) / 2; // 0–1
    const contrast = params.contrast / 100;
    const v = Math.min(1, Math.max(0, 0.5 + (noise - 0.5) * (1 + 2 * contrast)));

    // Dimmer towards the top and bottom: 75% at the edges.
    const edge = 1 - 0.25 * Math.abs((row - rows / 2) / (rows / 2));
    return scaleColour(samplePalette(v), Math.floor(255 * edge));
  },
});

/** The palette as a smooth gradient: 0 = first colour, 1 = last. */
const samplePalette = (position: number): Rgb => {
  const x = position * (PALETTE.length - 1);
  const i = Math.floor(x);
  const from = PALETTE[i];
  const to = PALETTE[Math.min(PALETTE.length - 1, i + 1)];
  const channel = (c: number) => Math.floor(from[c] + (to[c] - from[c]) * (x - i));
  return [channel(0), channel(1), channel(2)];
};

/** The colour at `level` / 255 brightness. */
const scaleColour = (colour: Rgb, level: number): Rgb => {
  if (level <= 0) return [0, 0, 0];
  if (level >= 255) return colour;
  return [
    Math.floor((colour[0] * level) / 255),
    Math.floor((colour[1] * level) / 255),
    Math.floor((colour[2] * level) / 255),
  ];
};
