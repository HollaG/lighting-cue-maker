import { definePatternEffect } from "../patternEffect";

export default definePatternEffect({
  id: "columnChase",
  name: "Column chase",
  description: "One column lit at a time, moving left to right.",
  colourCount: 1,
  stepCount: ({ cols }) => cols,
  colourAt: ({ col, step, colours }) => (col === step ? colours[0] : null),
});
