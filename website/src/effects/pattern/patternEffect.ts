/**
 * Pattern effects: what colour each cell of a fixture group's grid has at each step.
 *
 * HOW TO ADD A PATTERN EFFECT
 *   1. Copy `effects/columnChase.ts` to `effects/<yourEffect>.ts`.
 *   2. Give it a new, unique `id` (stored in PatternSelectable.effect, so never rename it later),
 *      a `name` and a `description` for the LD.
 *   3. Write `stepCount` and `colourAt`. That's all: the file is picked up automatically (see registry.ts),
 *      and the registry test runs it on several grid sizes.
 *   4. Optional: `params`, settings the LD can change (see `PatternParam`). The LD screen builds an input for each
 *      one, and `colourAt` / `stepCount` get the chosen values as `params`, typed from your declaration.
 *      Declare them inline in `definePatternEffect` so the types work. Never rename a param id or a list option:
 *      saved selectables point at them (a missing one quietly falls back to the default).
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

// --- Params: settings the LD can change per selectable (like QLC+ RGB script properties) -------------------

/** A dropdown. Values are stored as-is, and the LD sees them with the first letter capitalised. */
export type ListParam = {
  type: "list";
  id: string;
  label: string;
  options: readonly string[];
  default: string;
};

/** A number from `min` to `max`. */
export type RangeParam = {
  type: "range";
  id: string;
  label: string;
  min: number;
  max: number;
  /** Increment of the input. Default 1. */
  step?: number;
  default: number;
};

/** On / off. */
export type ToggleParam = {
  type: "toggle";
  id: string;
  label: string;
  default: boolean;
};

export type PatternParam = ListParam | RangeParam | ToggleParam;
export type PatternParamValue = string | number | boolean;
/** The values the effect gets, by param id. Always complete: missing or invalid ones are replaced by the default. */
export type PatternParamValues = Readonly<Record<string, PatternParamValue>>;

/** The value type of one param: a list gives the union of its options, e.g. "horizontal" | "vertical". */
type ParamValueOf<P extends PatternParam> = P extends ListParam
  ? P["options"][number]
  : P extends RangeParam
    ? number
    : boolean;

/** `params` typed from an effect's declaration, e.g. { orientation: "horizontal" | "vertical" }. */
export type ParamValuesOf<P extends readonly PatternParam[]> = {
  readonly [K in P[number] as K["id"]]: ParamValueOf<K>;
};

/**
 * The effect's param values for a selectable: the stored value if it is still valid, otherwise the default.
 * Range values are clamped. Unknown ids (e.g. a removed param) are dropped.
 */
export const resolvePatternParams = (
  params: readonly PatternParam[] | undefined,
  stored: Readonly<Record<string, unknown>> | undefined,
): PatternParamValues => {
  const result: Record<string, PatternParamValue> = {};
  for (const param of params ?? []) {
    const value = stored?.[param.id];
    switch (param.type) {
      case "list":
        result[param.id] = typeof value === "string" && param.options.includes(value) ? value : param.default;
        break;
      case "range":
        result[param.id] =
          typeof value === "number" && Number.isFinite(value)
            ? Math.min(param.max, Math.max(param.min, value))
            : param.default;
        break;
      case "toggle":
        result[param.id] = typeof value === "boolean" ? value : param.default;
        break;
    }
  }
  return result;
};

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
  /** The LD's param values (see `params`). */
  params: PatternParamValues;
};

export type PatternStepCountInput = GridSize & { params: PatternParamValues };

export type PatternEffectDefinition = {
  /** Stored in PatternSelectable.effect. Unique, and never rename it: saved selectables point at it. */
  id: string;
  /** Shown to the LD. */
  name: string;
  /** Shown to the LD. */
  description: string;
  /** How many colour pickers the LD sees. 0 = the effect makes its own colours (e.g. rainbow). */
  colourCount: 0 | 1 | 2;
  /** Settings the LD can change. Ids must be unique within the effect. */
  params?: readonly PatternParam[];
  /** Steps in one loop of the effect, for this grid size. At least 1. */
  stepCount: (input: PatternStepCountInput) => number;
  /** The cell's colour in this step. `null` = off (black). */
  colourAt: (input: PatternCellInput) => Rgb | null;
};

/** What an effect file writes: like PatternEffectDefinition, but `params` in the inputs is typed from `params`. */
type TypedPatternEffect<P extends readonly PatternParam[]> = Omit<
  PatternEffectDefinition,
  "params" | "stepCount" | "colourAt"
> & {
  params?: P;
  stepCount: (input: GridSize & { params: ParamValuesOf<P> }) => number;
  colourAt: (input: Omit<PatternCellInput, "params"> & { params: ParamValuesOf<P> }) => Rgb | null;
};

/**
 * Does nothing at runtime; it only gives the effect object its type (and type errors where you write it).
 * `const P` keeps the literal ids and options, so `params.orientation` is typed "horizontal" | "vertical".
 */
export const definePatternEffect = <const P extends readonly PatternParam[] = []>(
  definition: TypedPatternEffect<P>,
): PatternEffectDefinition =>
  // Safe: the engine always passes resolvePatternParams(definition.params, …), which matches ParamValuesOf<P>.
  definition as unknown as PatternEffectDefinition;

/**
 * The numbers 0 … length-1 in a shuffled order that only depends on `seed`. For effects that need the same
 * random choice for every cell of a step (e.g. "which cell is lit"), which `input.random()` can't give,
 * because that one is seeded per cell.
 */
export const seededShuffle = (length: number, seed: number): number[] => {
  let state = Math.imul(seed + 1, 2654435761) | 0;
  const next = () => {
    // mulberry32
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1)); // Fisher–Yates
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
};

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
