import { definePatternEffect, hsvToRgb } from "../patternEffect";

const STEPS = 24;

export default definePatternEffect({
  id: "rainbow",
  name: "Rainbow",
  description: "A rainbow that scrolls across the columns. Makes its own colours.",
  colourCount: 0,
  stepCount: () => STEPS,
  // Spread one full rainbow over the columns, and shift it a bit each step.
  colourAt: ({ col, cols, step }) => hsvToRgb((col / cols) * 360 + (step / STEPS) * 360),
});
