import { definePatternEffect } from "../patternEffect";

export default definePatternEffect({
  id: "twinkle",
  name: "Twinkle",
  description: "Random cells light up, about a third at a time.",
  colourCount: 1,
  stepCount: () => 16,
  colourAt: ({ colours, random }) => (random() < 0.33 ? colours[0] : null),
});
