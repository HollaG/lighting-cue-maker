import { definePatternEffect, seededShuffle } from "../patternEffect";

/** Different random orders before the effect repeats. */
const ROUNDS = 8;

// Based on QLC+'s "Random Single" RGB script (resources/rgbscripts/randomsingle.js).
// QLC+ reshuffles every 2 steps; here each cell is lit once per round (as that script's own comment describes),
// in a new random order each round.
export default definePatternEffect({
  id: "randomSingle",
  name: "Random single",
  description: "One random cell lit at a time.",
  colourCount: 1,
  stepCount: ({ cols, rows }) => cols * rows * ROUNDS,
  colourAt: ({ col, row, cols, rows, step, colours }) => {
    const cells = cols * rows;
    const order = seededShuffle(cells, Math.floor(step / cells));
    return order[step % cells] === row * cols + col ? colours[0] : null;
  },
});
