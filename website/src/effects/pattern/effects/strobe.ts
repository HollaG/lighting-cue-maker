import { definePatternEffect } from "../patternEffect";

// Based on QLC+'s "Strobe" RGB script (resources/rgbscripts/strobe.js).
export default definePatternEffect({
  id: "strobe",
  name: "Strobe",
  description: "The whole grid flashes on for one step, then stays off for the rest of the cycle.",
  colourCount: 1,
  params: [{ type: "range", id: "frequency", label: "Frequency", min: 2, max: 10, default: 2 }],
  // One step on, (frequency - 1) steps off.
  stepCount: ({ params }) => params.frequency,
  colourAt: ({ step, colours }) => (step === 0 ? colours[0] : null),
});
