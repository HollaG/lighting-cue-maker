import { describe, expect, it } from "vitest";
import type { Grid } from "../../../types-v2/fixtureGroups";
import type { FixtureTemplate } from "../../../types-v2/fixtureTemplates";
import { BlendMode, SelectableType, type PatternSelectable } from "../../../types-v2/optionSet";
import type { PatchedFixture } from "../../../types-v2/patchedFixture";
import { compileOverrides } from "../../../utils/visualiser-v2-resolver";
import { decodeHeadStates, getHeadDecoder } from "../../../utils/visualiser-v2-decoder";
import { getNextPatternChangeDelay } from "../applyPatternEffects";
import { compilePatternPlayer, type ActivePattern } from "../patternPlayer";

// Master dimmer + 4 RGBW heads. Slots: 0 dim, then r,g,b,w per head.
const template = {
  id: "t1",
  channels: [
    { id: "dim", type: "masterDimmer", defaultValue: 0 },
    { id: "r", type: "red", defaultValue: 0 },
    { id: "g", type: "green", defaultValue: 0 },
    { id: "b", type: "blue", defaultValue: 0 },
    { id: "w", type: "white", defaultValue: 0 },
  ],
  modes: [
    {
      id: "m1",
      channelIds: ["dim", ...Array.from({ length: 4 }, () => ["r", "g", "b", "w"]).flat()],
      heads: Array.from({ length: 4 }, (_, h) => ({ name: `H${h}`, channelIndexes: [1, 2, 3, 4].map((s) => s + h * 4) })),
    },
  ],
} as unknown as FixtureTemplate;

const fixture = { id: "f1", fixtureTemplateId: "t1", modeId: "m1" } as PatchedFixture;
const grid: Grid = { cols: 4, rows: 1, cells: [0, 1, 2, 3].map((h) => ({ col: h, row: 0, head: h, fixtureId: "f1" })) };
const base = { f1: [255, ...Array.from({ length: 4 }, () => [200, 0, 0, 0]).flat()] };

const pattern = (effect: string, overrides: Partial<PatternSelectable> = {}): ActivePattern => ({
  grid,
  selectable: {
    id: effect,
    name: effect,
    fixtureIds: "all",
    type: SelectableType.EFFECT_PATTERN,
    effect,
    colours: [
      { name: "A", hex: "#ff8040" },
      { name: "B", hex: "#2040ff" },
    ],
    blendMode: BlendMode.NORMAL,
    colourMode: "rgb",
    stepDuration: 300,
    fadeInDuration: 120,
    fadeOutDuration: 200,
    ...overrides,
  },
});

const compile = (patterns: ActivePattern[], overrides?: Parameters<typeof compileOverrides>[0]) =>
  compilePatternPlayer({
    base,
    patterns,
    fixtures: [fixture],
    fixtureTemplates: [template],
    overrides: compileOverrides(overrides, [fixture], [template]),
  });

describe("compilePatternPlayer", () => {
  it("gives the same values frame by frame as evaluating each time from scratch", () => {
    const patterns = [pattern("stripes"), pattern("randomFillSingle", { blendMode: BlendMode.ADDITIVE, stepDuration: 170 })];
    const running = compile(patterns);
    // Uneven frame times, a long stall, and a jump back to the start (a new cue reuses nothing: fresh player).
    for (let t = 0; t < 4000; t += 7 + (t % 23)) {
      running.evaluate(t);
      const fresh = compile(patterns);
      fresh.evaluate(t);
      expect(running.values.get("f1"), `t=${t}`).toEqual(fresh.values.get("f1"));
    }
  });

  it("reports no change while holding a step, and a change on the next step", () => {
    const player = compile([pattern("stripes", { fadeInDuration: 0, fadeOutDuration: 0 })]);
    expect(player.evaluate(10)).toBe(true);
    expect(player.evaluate(150)).toBe(false);
    expect(player.evaluate(310)).toBe(true);
  });

  it("applies overrides after the effects", () => {
    const player = compile([pattern("stripes", { fadeInDuration: 0, fadeOutDuration: 0 })], { f1: { r: 7 } });
    player.evaluate(0);
    // `r` is the first red slot of the mode (head 0).
    expect(player.values.get("f1")![1]).toBe(7);
  });

  it("mask on RGBW: a white cell keeps the red base, an off cell goes black", () => {
    const player = compile([
      pattern("stripes", {
        blendMode: BlendMode.MASK,
        colours: [{ name: "White", hex: "#ffffff" }],
        fadeInDuration: 0,
        fadeOutDuration: 0,
      }),
    ]);
    player.evaluate(0);
    // Head 0 lit, heads 1-3 off.
    expect(player.values.get("f1")).toEqual([255, 200, 0, 0, 0, ...Array.from({ length: 3 }, () => [0, 0, 0, 0]).flat()]);
  });

  it("mask on RGBW: a coloured cell filters a white base", () => {
    const whiteBase = { f1: [255, ...Array.from({ length: 4 }, () => [0, 0, 0, 255]).flat()] };
    const player = compilePatternPlayer({
      base: whiteBase,
      patterns: [
        pattern("stripes", {
          blendMode: BlendMode.MASK,
          colours: [{ name: "Red", hex: "#ff0000" }],
          fadeInDuration: 0,
          fadeOutDuration: 0,
        }),
      ],
      fixtures: [fixture],
      fixtureTemplates: [template],
    });
    player.evaluate(0);
    // W-only white is full R, G and B light; the red cell keeps only the red.
    expect(player.values.get("f1")!.slice(1, 9)).toEqual([255, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("never changes the base", () => {
    const before = structuredClone(base);
    compile([pattern("stripes")]).evaluate(500);
    expect(base).toEqual(before);
  });
});

describe("getNextPatternChangeDelay", () => {
  it("is 0 while any pattern fades, and otherwise the nearest step of any pattern", () => {
    const slow = pattern("stripes", { stepDuration: 1000, fadeInDuration: 0, fadeOutDuration: 0 });
    const fast = pattern("stripes", { stepDuration: 250, fadeInDuration: 0, fadeOutDuration: 0 });
    expect(getNextPatternChangeDelay([slow, fast], 100)).toBe(150);
    const fading = pattern("stripes", { stepDuration: 1000, fadeInDuration: 300 });
    expect(getNextPatternChangeDelay([fading, fast], 100)).toBe(0);
  });

  it("fades up from black at the start even without a valid step length", () => {
    const noSteps = pattern("stripes", { stepDuration: 0, fadeInDuration: 300 });
    expect(getNextPatternChangeDelay([noSteps], 100)).toBe(0);
    expect(getNextPatternChangeDelay([noSteps], 400)).toBe(Infinity);
  });
});

describe("getHeadDecoder", () => {
  it("decodes like decodeHeadStates", () => {
    const values = [200, 255, 0, 255, 0, 128, 0, 0, 0, 10, 10, 10, 10, 0, 0, 0, 0];
    const decoder = getHeadDecoder(template, "m1")!;
    const out = decoder.createOutput();
    decoder.decode(values, out);
    expect(decodeHeadStates(values, template, "m1")).toEqual([
      { colour: "#ff00ff", intensity: 78 },
      { colour: "#ff0000", intensity: 39 },
      { colour: "#ffffff", intensity: 6 },
      { colour: "#000000", intensity: 0 },
    ]);
    expect(out[1]).toEqual({ r: 255, g: 0, b: 0, intensity: 39 });
  });

  it("returns null for a missing mode", () => {
    expect(getHeadDecoder(template, "nope")).toBeNull();
  });
});
