import { definePatternEffect, hsvToRgb } from "../patternEffect";

const STEPS = 24;

export default definePatternEffect({
  id: "rainbow",
  name: "Rainbow",
  description: "A rainbow that scrolls across the grid. Makes its own colours.",
  colourCount: 0,
  params: [
    {
      type: "list",
      id: "orientation",
      label: "Orientation",
      options: ["horizontal", "vertical", "radial"],
      default: "horizontal",
    },
  ],
  stepCount: () => STEPS,
  // Spread one full rainbow over the grid, and shift it a bit each step.
  colourAt: ({ col, row, cols, rows, step, params }) => {
    const position = getPosition(params.orientation, col, row, cols, rows);
    return hsvToRgb(position * 360 + (step / STEPS) * 360);
  },
});

/** Where the cell is along the rainbow, 0 (start) to just under 1. */
const getPosition = (
  orientation: "horizontal" | "vertical" | "radial",
  col: number,
  row: number,
  cols: number,
  rows: number,
): number => {
  switch (orientation) {
    case "vertical":
      return row / rows;
    case "radial": {
      // Distance from the centre, so the rainbow moves in rings. The corners are at (just under) 1.
      const centreCol = (cols - 1) / 2;
      const centreRow = (rows - 1) / 2;
      const maxDistance = Math.hypot(centreCol, centreRow) + 1;
      return Math.hypot(col - centreCol, row - centreRow) / maxDistance;
    }
    case "horizontal":
    default:
      return col / cols;
  }
};
