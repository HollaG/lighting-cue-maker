import { definePatternEffect } from "../patternEffect";

// Based on QLC+'s "Fill Unfill Squares From Center" RGB script (resources/rgbscripts/fillunfillsquaresfromcenter.js).
export default definePatternEffect({
  id: "fillUnfillSquaresFromCentre",
  name: "Fill unfill squares from centre",
  description: "A square grows from the middle until the grid is full, then a hole grows from the middle.",
  colourCount: 1,
  stepCount: ({ cols, rows }) => Math.floor((Math.max(cols, rows) + 1) / 2) * 2 - 1,
  colourAt: ({ col, row, cols, rows, step, colours }) => {
    const colCentre = Math.floor((cols + 1) / 2) - 1;
    const rowCentre = Math.floor((rows + 1) / 2) - 1;
    const isColsEven = cols % 2 === 0;
    const isRowsEven = rows % 2 === 0;
    const centreStep = Math.max(colCentre, rowCentre) + 1; // steps to fill
    const inSquare = (size: number) =>
      col <= colCentre + size + (isColsEven ? 1 : 0) &&
      col >= colCentre - size &&
      row <= rowCentre + size + (isRowsEven ? 1 : 0) &&
      row >= rowCentre - size;

    // Filling: the square is lit. Emptying: the square is the hole.
    const lit = step < centreStep ? inSquare(step) : !inSquare(step - centreStep);
    return lit ? colours[0] : null;
  },
});
