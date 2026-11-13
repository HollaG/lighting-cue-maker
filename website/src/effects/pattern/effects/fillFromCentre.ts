import { definePatternEffect } from "../patternEffect";

// Based on QLC+'s "Fill From Center" RGB script (resources/rgbscripts/fillfromcenter.js).
export default definePatternEffect({
  id: "fillFromCentre",
  name: "Fill from centre",
  description: "Fills outwards from the middle column (or row) until the grid is full, then starts again.",
  colourCount: 1,
  params: [
    { type: "list", id: "orientation", label: "Orientation", options: ["horizontal", "vertical"], default: "horizontal" },
  ],
  stepCount: ({ cols, rows, params }) => Math.floor(((params.orientation === "vertical" ? rows : cols) + 1) / 2),
  colourAt: ({ col, row, cols, rows, step, colours, params }) => {
    const vertical = params.orientation === "vertical";
    const length = vertical ? rows : cols;
    const position = vertical ? row : col;
    const centre = Math.floor((length + 1) / 2) - 1;
    const isEven = length % 2 === 0; // two middle cells
    return position <= centre + step + (isEven ? 1 : 0) && position >= centre - step ? colours[0] : null;
  },
});
