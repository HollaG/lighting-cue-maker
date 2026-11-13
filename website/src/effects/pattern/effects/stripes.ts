import { definePatternEffect } from "../patternEffect";

// Based on QLC+'s "Stripes" RGB script (resources/rgbscripts/stripes.js).
export default definePatternEffect({
  id: "stripes",
  name: "Stripes",
  description: "One column (or row) lit at a time, moving across the grid.",
  colourCount: 1,
  params: [
    { type: "list", id: "orientation", label: "Orientation", options: ["horizontal", "vertical"], default: "horizontal" },
  ],
  stepCount: ({ cols, rows, params }) => (params.orientation === "vertical" ? rows : cols),
  colourAt: ({ col, row, step, colours, params }) =>
    (params.orientation === "vertical" ? row : col) === step ? colours[0] : null,
});
