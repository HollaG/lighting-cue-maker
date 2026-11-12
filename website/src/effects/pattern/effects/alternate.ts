import { definePatternEffect } from "../patternEffect";

export default definePatternEffect({
  id: "alternate",
  name: "Alternate",
  description: "A checkerboard of two colours that swap every step.",
  colourCount: 2,
  stepCount: () => 2,
  colourAt: ({ col, row, step, colours }) => colours[(col + row + step) % 2],
});
