import { definePatternEffect, type Rgb } from "../patternEffect";

// Based on QLC+'s "Gradient" RGB script (resources/rgbscripts/gradient.js): a looping gradient through a preset's
// colours that scrolls one cell per step. Same in QLC+ 4.14 and 5.x.

const PRESETS: Record<string, Rgb[]> = {
  rainbow: [
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
  ],
  sunset: [
    [255, 255, 0],
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

export default definePatternEffect({
  id: "gradient",
  name: "Gradient",
  description: "A preset colour gradient scrolling across the grid. Makes its own colours.",
  colourCount: 0,
  params: [
    {
      type: "list",
      id: "preset",
      label: "Preset",
      options: ["rainbow", "sunset", "abstract", "ocean"],
      default: "rainbow",
    },
    { type: "range", id: "size", label: "Size", min: 1, max: 40, default: 5 },
    {
      type: "list",
      id: "orientation",
      label: "Orientation",
      options: ["horizontal", "vertical", "radial"],
      default: "horizontal",
    },
  ],
  // One step per gradient colour: `size` colours for each preset colour (the colour itself, then the blend).
  stepCount: ({ params }) => PRESETS[params.preset].length * params.size,
  colourAt: ({ col, row, cols, rows, step, stepCount, params }) => {
    const index = (step + getOffset(params.orientation, col, row, cols, rows)) % stepCount;
    return gradientAt(PRESETS[params.preset], params.size, index);
  },
});

/** How many gradient colours the cell is ahead of the first cell. Radial = rounded distance from the centre. */
const getOffset = (
  orientation: "horizontal" | "vertical" | "radial",
  col: number,
  row: number,
  cols: number,
  rows: number,
): number => {
  switch (orientation) {
    case "vertical":
      return row;
    case "radial":
      return Math.round(Math.hypot(col - (cols - 1) / 2, row - (rows - 1) / 2));
    case "horizontal":
    default:
      return col;
  }
};

/** Colour `index` of the looping gradient: each preset colour, then `size - 1` blends towards the next (last → first). */
const gradientAt = (palette: Rgb[], size: number, index: number): Rgb => {
  const from = palette[Math.floor(index / size)];
  const to = palette[(Math.floor(index / size) + 1) % palette.length];
  const s = index % size;
  const channel = (i: number) => Math.floor(from[i] + ((to[i] - from[i]) / size) * s);
  return [channel(0), channel(1), channel(2)];
};
