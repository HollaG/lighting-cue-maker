import { definePatternEffect, seededShuffle } from "../patternEffect";

/** Different random orders before the effect repeats. QLC+ reshuffles every loop; this engine's loop is fixed. */
const ROUNDS = 8;

// Based on QLC+'s "Random Fill Column" RGB script (resources/rgbscripts/randomfillcolumn.js).
export default definePatternEffect({
  id: "randomFillColumn",
  name: "Random fill column",
  description: "Lights one more column each step, in a random order, until the grid is full.",
  colourCount: 1,
  stepCount: ({ cols }) => cols * ROUNDS,
  colourAt: ({ col, cols, step, colours }) => {
    const round = Math.floor(step / cols);
    const filled = (step % cols) + 1; // columns lit so far in this round
    const order = seededShuffle(cols, round);
    return order.indexOf(col) < filled ? colours[0] : null;
  },
});
