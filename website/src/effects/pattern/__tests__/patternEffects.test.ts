// Runs every registered pattern effect, so a new effect file is tested without writing a test for it.
import { describe, expect, it } from "vitest";
import { WHITE, type Rgb } from "../patternEffect";
import { patternEffects } from "../registry";

const SIZES = [
  { cols: 1, rows: 1 },
  { cols: 8, rows: 1 },
  { cols: 1, rows: 8 },
  { cols: 4, rows: 8 },
];

// A fixed generator, so two runs see the same numbers.
const fixedRandom = () => {
  let i = 0;
  return () => ((i++ * 0.37) % 1 + 1) % 1;
};

describe("pattern effect registry", () => {
  it("has effects", () => {
    expect(patternEffects.size).toBeGreaterThan(0);
  });

  for (const effect of patternEffects.values()) {
    describe(effect.id, () => {
      it("has a name and description", () => {
        expect(effect.name.trim()).not.toBe("");
        expect(effect.description.trim()).not.toBe("");
      });

      for (const { cols, rows } of SIZES) {
        it(`works on a ${cols}×${rows} grid`, () => {
          const stepCount = effect.stepCount({ cols, rows });
          expect(Number.isInteger(stepCount)).toBe(true);
          expect(stepCount).toBeGreaterThanOrEqual(1);

          for (let step = 0; step < stepCount; step++) {
            for (let col = 0; col < cols; col++) {
              for (let row = 0; row < rows; row++) {
                const input = {
                  col,
                  row,
                  cols,
                  rows,
                  step,
                  stepCount,
                  colours: ([WHITE, [255, 0, 0]] as Rgb[]).slice(0, effect.colourCount),
                };
                const a = effect.colourAt({ ...input, random: fixedRandom() });
                const b = effect.colourAt({ ...input, random: fixedRandom() });
                expect(a).toEqual(b); // deterministic
                if (a === null) continue;
                expect(a).toHaveLength(3);
                for (const v of a) {
                  expect(Number.isInteger(v)).toBe(true);
                  expect(v).toBeGreaterThanOrEqual(0);
                  expect(v).toBeLessThanOrEqual(255);
                }
              }
            }
          }
        });
      }
    });
  }
});
