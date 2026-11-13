import { definePatternEffect, seededShuffle } from "../patternEffect";

/** Different random orders before the effect repeats. QLC+ reshuffles every loop; this engine's loop is fixed. */
const ROUNDS = 8;

// Based on QLC+'s "Random Fill Row" RGB script (resources/rgbscripts/randomfillrow.js).
export default definePatternEffect({
  id: "randomFillRow",
  name: "Random fill row",
  description: "Lights one more row each step, in a random order, until the grid is full.",
  colourCount: 1,
  stepCount: ({ rows }) => rows * ROUNDS,
  colourAt: ({ row, rows, step, colours }) => {
    const round = Math.floor(step / rows);
    const filled = (step % rows) + 1; // rows lit so far in this round
    const order = seededShuffle(rows, round);
    return order.indexOf(row) < filled ? colours[0] : null;
  },
});
