import { definePatternEffect } from "../patternEffect";

// Based on QLC+'s "Fill Unfill" RGB script (resources/rgbscripts/fillunfill.js).
export default definePatternEffect({
  id: "fillUnfill",
  name: "Fill unfill",
  description: "Fills the grid one column (or row) at a time, then empties it from the same side.",
  colourCount: 1,
  params: [
    { type: "list", id: "orientation", label: "Orientation", options: ["horizontal", "vertical"], default: "horizontal" },
  ],
  stepCount: ({ cols, rows, params }) => (params.orientation === "vertical" ? rows : cols) * 2 - 1,
  colourAt: ({ col, row, cols, rows, step, colours, params }) => {
    const vertical = params.orientation === "vertical";
    const length = vertical ? rows : cols;
    const position = vertical ? row : col;
    // First half fills, second half empties.
    const lit = step < length ? position <= step : position > step - length;
    return lit ? colours[0] : null;
  },
});
