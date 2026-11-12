/**
 * Pattern effects: what colour each cell of a fixture group's grid has at each step.
 *
 * HOW TO ADD A PATTERN EFFECT
 *   1. Copy `effects/columnChase.ts` to `effects/<yourEffect>.ts`.
 *   2. Give it a new, unique `id` (stored in PatternSelectable.effect, so never rename it later),
 *      a `name` and a `description` for the LD.
 *   3. Write `stepCount` and `colourAt`. That's all: the file is picked up automatically (see registry.ts),
 *      and the registry test runs it on several grid sizes.
 *
 * Rules for `colourAt`:
 *   - Pure: the same input gives the same output. No state, no Date.now(), no Math.random()
 *     (use `input.random()`, which is seeded per step and cell).
 *   - Only decide colours. Never think about DMX, channels, heads, timing, fades or blend modes:
 *     the engine (applyPatternEffects.ts) does all of that.
 *   - Must work on any grid size, including a single row or column, and 1×1.
 */

/** [r, g, b], each 0–255. */
export type Rgb = readonly [number, number, number];

export const BLACK: Rgb = [0, 0, 0];
export const WHITE: Rgb = [255, 255, 255];

export type GridSize = { cols: number; rows: number };

export type PatternCellInput = {
  /** 0-based, left to right. */
  col: number;
  /** 0-based, top to bottom. */
  row: number;
  cols: number;
  rows: number;
  /** 0 … stepCount - 1 */
  step: number;
  stepCount: number;
  /** The LD's colours. Always has at least `colourCount` entries (missing ones are white). */
  colours: Rgb[];
  /** 0 ≤ n < 1. Seeded by (step, col, row), so the same cell in the same step always gets the same numbers. */
  random: () => number;
};

export type PatternEffectDefinition = {
  /** Stored in PatternSelectable.effect. Unique, and never rename it: saved selectables point at it. */
  id: string;
  /** Shown to the LD. */
  name: string;
  /** Shown to the LD. */
  description: string;
  /** How many colour pickers the LD sees. 0 = the effect makes its own colours (e.g. rainbow). */
  colourCount: 0 | 1 | 2;
  /** Steps in one loop of the effect, for this grid size. At least 1. */
  stepCount: (size: GridSize) => number;
  /** The cell's colour in this step. `null` = off (black). */
  colourAt: (input: PatternCellInput) => Rgb | null;
};

/** Does nothing at runtime; it only gives the effect object its type (and type errors where you write it). */
export const definePatternEffect = (definition: PatternEffectDefinition): PatternEffectDefinition => definition;

/**
 * HSV to RGB.
 * @param hue degrees, any number (wraps around)
 * @param saturation 0–1
 * @param value 0–1
 */
export const hsvToRgb = (hue: number, saturation = 1, value = 1): Rgb => {
  const h = (((hue % 360) + 360) % 360) / 60;
  const c = value * saturation;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = value - c;
  const [r, g, b] =
    h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
};
