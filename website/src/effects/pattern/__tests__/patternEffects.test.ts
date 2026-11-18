// Runs every registered pattern effect, so a new effect file is tested without writing a test for it.
import { describe, expect, it } from "vitest";
import {
  WHITE,
  resolvePatternParams,
  type PatternEffectDefinition,
  type PatternParamValues,
  type Rgb,
} from "../patternEffect";
import { patternEffects } from "../registry";

const SIZES = [
  { cols: 1, rows: 1 },
  { cols: 8, rows: 1 },
  { cols: 1, rows: 8 },
  { cols: 4, rows: 8 },
];

/** Every step, or for long loops (e.g. plasma, ~100k steps) 64 spread across the loop, including the last. */
const MAX_STEPS_CHECKED = 64;
const sampleSteps = (stepCount: number): number[] => {
  if (stepCount <= MAX_STEPS_CHECKED) return Array.from({ length: stepCount }, (_, i) => i);
  const steps = Array.from({ length: MAX_STEPS_CHECKED - 1 }, (_, i) =>
    Math.floor((i * stepCount) / (MAX_STEPS_CHECKED - 1)),
  );
  return [...steps, stepCount - 1];
};

// A fixed generator, so two runs see the same numbers.
const fixedRandom = () => {
  let i = 0;
  return () => (((i++ * 0.37) % 1) + 1) % 1;
};

/**
 * The param values to run an effect with: all defaults, then each param changed on its own to every list option,
 * the range's min and max, or the other toggle value. One at a time, so the count stays small.
 */
const paramVariants = (effect: PatternEffectDefinition): PatternParamValues[] => {
  const defaults = resolvePatternParams(effect.params, {});
  const variants: PatternParamValues[] = [defaults];
  for (const param of effect.params ?? []) {
    const values =
      param.type === "list" ? param.options : param.type === "range" ? [param.min, param.max] : [!param.default];
    for (const value of values) variants.push({ ...defaults, [param.id]: value });
  }
  return variants;
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

      it("declares valid params", () => {
        const params = effect.params ?? [];
        const ids = params.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length); // unique
        for (const param of params) {
          expect(param.id.trim()).not.toBe("");
          expect(param.label.trim()).not.toBe("");
          if (param.type === "list") {
            expect(param.options.length).toBeGreaterThan(0);
            expect(new Set(param.options).size).toBe(param.options.length);
            expect(param.options).toContain(param.default);
          } else if (param.type === "range") {
            expect(param.min).toBeLessThan(param.max);
            expect(param.default).toBeGreaterThanOrEqual(param.min);
            expect(param.default).toBeLessThanOrEqual(param.max);
          }
        }
      });

      for (const { cols, rows } of SIZES)
        for (const params of paramVariants(effect)) {
          it(`works on a ${cols}×${rows} grid with ${JSON.stringify(params)}`, () => {
            const stepCount = effect.stepCount({ cols, rows, params });
            expect(Number.isInteger(stepCount)).toBe(true);
            expect(stepCount).toBeGreaterThanOrEqual(1);

            for (const step of sampleSteps(stepCount)) {
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
                    params,
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

describe("resolvePatternParams", () => {
  const params = [
    {
      type: "list",
      id: "orientation",
      label: "Orientation",
      options: ["horizontal", "vertical"],
      default: "horizontal",
    },
    { type: "range", id: "size", label: "Size", min: 1, max: 10, default: 5 },
    { type: "toggle", id: "fade", label: "Fade", default: false },
  ] as const;

  it("uses defaults when nothing is stored", () => {
    expect(resolvePatternParams(params, undefined)).toEqual({ orientation: "horizontal", size: 5, fade: false });
  });

  it("keeps valid stored values", () => {
    expect(resolvePatternParams(params, { orientation: "vertical", size: 3, fade: true })).toEqual({
      orientation: "vertical",
      size: 3,
      fade: true,
    });
  });

  it("replaces invalid values with the default, clamps ranges and drops unknown ids", () => {
    expect(resolvePatternParams(params, { orientation: "diagonal", size: 99, fade: "yes", removed: 1 })).toEqual({
      orientation: "horizontal",
      size: 10,
      fade: false,
    });
    expect(resolvePatternParams(params, { size: Number.NaN }).size).toBe(5);
  });
});

describe("gradient (matches QLC+ gradient.js)", () => {
  const gradient = patternEffects.get("gradient")!;
  const colourAt = (col: number, row: number, step: number, params: PatternParamValues) =>
    gradient.colourAt({ col, row, cols: 3, rows: 3, step, stepCount: 15, colours: [], random: Math.random, params });
  const rainbow = { preset: "rainbow", size: 5, orientation: "horizontal" };

  it("has `size` colours per preset colour", () => {
    expect(gradient.stepCount({ cols: 3, rows: 3, params: rainbow })).toBe(15);
  });

  it("blends towards the next colour, and the cell to the right is one colour ahead", () => {
    expect(colourAt(0, 0, 0, rainbow)).toEqual([255, 0, 0]);
    expect(colourAt(1, 0, 0, rainbow)).toEqual([204, 51, 0]);
    expect(colourAt(0, 0, 1, rainbow)).toEqual([204, 51, 0]);
    expect(colourAt(0, 0, 14, rainbow)).toEqual([204, 0, 51]); // last blend: blue back to red
  });

  it("radial: cells the same distance from the centre match", () => {
    const radial = { ...rainbow, orientation: "radial" };
    expect(colourAt(0, 0, 0, radial)).toEqual(colourAt(2, 2, 0, radial));
    expect(colourAt(1, 1, 0, radial)).toEqual([255, 0, 0]);
  });
});
