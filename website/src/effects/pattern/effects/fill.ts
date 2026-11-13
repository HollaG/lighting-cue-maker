import { definePatternEffect } from "../patternEffect";

// Based on QLC+'s "Fill" RGB script (resources/rgbscripts/fill.js).
export default definePatternEffect({
  id: "fill",
  name: "Fill",
  description: "Lights one more column (or row) each step until the grid is full, then starts again.",
  colourCount: 1,
  params: [
    {
      type: "list",
      id: "orientation",
      label: "Orientation",
      options: ["horizontal", "vertical", "horizontal reversed", "vertical reversed"],
      default: "horizontal",
    },
  ],
  stepCount: ({ cols, rows, params }) => (params.orientation.startsWith("horizontal") ? cols : rows),
  colourAt: ({ col, row, cols, rows, step, colours, params }) => {
    switch (params.orientation) {
      case "vertical":
        return row <= step ? colours[0] : null;
      case "horizontal reversed":
        return col >= cols - step - 1 ? colours[0] : null;
      case "vertical reversed":
        return row >= rows - step - 1 ? colours[0] : null;
      case "horizontal":
      default:
        return col <= step ? colours[0] : null;
    }
  },
});
