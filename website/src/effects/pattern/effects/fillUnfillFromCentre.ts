import { definePatternEffect } from "../patternEffect";

// Based on QLC+'s "Fill Unfill From Center" RGB script (resources/rgbscripts/fillunfillfromcenter.js).
export default definePatternEffect({
  id: "fillUnfillFromCentre",
  name: "Fill unfill from centre",
  description: "Fills outwards from the middle column (or row), then empties outwards from the middle.",
  colourCount: 1,
  params: [
    { type: "list", id: "orientation", label: "Orientation", options: ["horizontal", "vertical"], default: "horizontal" },
  ],
  stepCount: ({ cols, rows, params }) =>
    Math.floor(((params.orientation === "vertical" ? rows : cols) + 1) / 2) * 2 - 1,
  colourAt: ({ col, row, cols, rows, step, colours, params }) => {
    const vertical = params.orientation === "vertical";
    const length = vertical ? rows : cols;
    const position = vertical ? row : col;
    const centreStep = Math.floor((length + 1) / 2); // steps to fill
    const centre = centreStep - 1;
    const isEven = length % 2 === 0; // two middle cells
    const inBand = (size: number) => position <= centre + size + (isEven ? 1 : 0) && position >= centre - size;

    // Filling: the band around the centre is lit. Emptying: the band is the hole.
    const lit = step < centreStep ? inBand(step) : !inBand(step - centreStep);
    return lit ? colours[0] : null;
  },
});
