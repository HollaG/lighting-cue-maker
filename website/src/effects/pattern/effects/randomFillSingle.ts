import { definePatternEffect, seededShuffle } from "../patternEffect";

/** Different random orders before the effect repeats. QLC+ reshuffles every loop; this engine's loop is fixed. */
const ROUNDS = 8;

// Based on QLC+'s "Random Fill Single" RGB script (resources/rgbscripts/randomfillsingle.js).
export default definePatternEffect({
  id: "randomFillSingle",
  name: "Random fill single",
  description: "Lights one more random cell each step until the grid is full.",
  colourCount: 1,
  stepCount: ({ cols, rows }) => cols * rows * ROUNDS,
  colourAt: ({ col, row, cols, rows, step, colours }) => {
    const cells = cols * rows;
    const round = Math.floor(step / cells);
    const filled = (step % cells) + 1; // cells lit so far in this round
    const order = seededShuffle(cells, round);
    return order.indexOf(row * cols + col) < filled ? colours[0] : null;
  },
});
