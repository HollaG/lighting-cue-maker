import { definePatternEffect } from "../patternEffect";

// Based on QLC+'s "Opposite" RGB script (resources/rgbscripts/opposite.js).
export default definePatternEffect({
  id: "opposite",
  name: "Opposite",
  description: "One cell per row moves across; every other row moves the opposite way. Vertical: per column.",
  colourCount: 1,
  params: [
    { type: "list", id: "orientation", label: "Orientation", options: ["horizontal", "vertical"], default: "horizontal" },
  ],
  stepCount: ({ cols, rows, params }) => (params.orientation === "vertical" ? rows : cols),
  colourAt: ({ col, row, cols, rows, step, colours, params }) => {
    if (params.orientation === "vertical") {
      // Even columns go down, odd columns go up.
      return row === (col % 2 === 0 ? step : rows - 1 - step) ? colours[0] : null;
    }
    // Even rows go right, odd rows go left.
    return col === (row % 2 === 0 ? step : cols - 1 - step) ? colours[0] : null;
  },
});
