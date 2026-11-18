import { describe, expect, it } from "vitest";
import type { Grid } from "../../../types-v2/fixtureGroups";
import type { FixtureTemplate } from "../../../types-v2/fixtureTemplates";
import { BlendMode, SelectableType, type PatternSelectable } from "../../../types-v2/optionSet";
import type { PatchedFixture } from "../../../types-v2/patchedFixture";
import { applyPatternEffects, getNextPatternChangeDelay, type ActivePattern } from "../applyPatternEffects";

// One fixture: master dimmer + 2 RGB heads. Slots: 0 dim, 1-3 head 0 (r,g,b), 4-6 head 1 (r,g,b).
const template = {
  id: "t1",
  channels: [
    { id: "dim", type: "masterDimmer" },
    { id: "r", type: "red" },
    { id: "g", type: "green" },
    { id: "b", type: "blue" },
  ],
  modes: [
    {
      id: "m1",
      channelIds: ["dim", "r", "g", "b", "r", "g", "b"],
      heads: [
        { name: "H0", channelIndexes: [1, 2, 3] },
        { name: "H1", channelIndexes: [4, 5, 6] },
      ],
    },
  ],
} as unknown as FixtureTemplate;

const fixture = { id: "f1", fixtureTemplateId: "t1", modeId: "m1" } as PatchedFixture;

// Two columns, one head each.
const grid: Grid = {
  cols: 2,
  rows: 1,
  cells: [
    { col: 0, row: 0, head: 0, fixtureId: "f1" },
    { col: 1, row: 0, head: 1, fixtureId: "f1" },
  ],
};

const chase = (overrides: Partial<PatternSelectable> = {}): ActivePattern => ({
  grid,
  selectable: {
    id: "s1",
    name: "Chase",
    fixtureIds: "all",
    type: SelectableType.EFFECT_PATTERN,
    effect: "stripes",
    colours: [{ name: "Blue", hex: "#0000ff" }],
    blendMode: BlendMode.NORMAL,
    colourMode: "rgb",
    stepDuration: 1000,
    fadeInDuration: 0,
    fadeOutDuration: 0,
    ...overrides,
  },
});

// Static: full dimmer, both heads red.
const base = { f1: [255, 255, 0, 0, 255, 0, 0] };

const apply = (pattern: ActivePattern, timeMs: number) =>
  applyPatternEffects({ base, patterns: [pattern], fixtures: [fixture], fixtureTemplates: [template], timeMs }).f1;

describe("applyPatternEffects", () => {
  it("normal: lit cell gets the effect colour, off cell goes black; dimmer untouched", () => {
    expect(apply(chase(), 0)).toEqual([255, 0, 0, 255, 0, 0, 0]);
    expect(apply(chase(), 1000)).toEqual([255, 0, 0, 0, 0, 0, 255]); // step 1: second column
    expect(apply(chase(), 2000)).toEqual([255, 0, 0, 255, 0, 0, 0]); // loops
  });

  it("mask: lit cell keeps the base colour, off cell goes black", () => {
    const pattern = chase({ blendMode: BlendMode.MASK, colours: [{ name: "White", hex: "#ffffff" }] });
    expect(apply(pattern, 0)).toEqual([255, 255, 0, 0, 0, 0, 0]);
  });

  it("additive and subtractive", () => {
    expect(apply(chase({ blendMode: BlendMode.ADDITIVE }), 0)).toEqual([255, 255, 0, 255, 255, 0, 0]);
    const white = [{ name: "White", hex: "#ffffff" }];
    expect(apply(chase({ blendMode: BlendMode.SUBTRACTIVE, colours: white }), 0)).toEqual([255, 0, 0, 0, 255, 0, 0]);
  });

  it("fades from the previous step", () => {
    const pattern = chase({ fadeInDuration: 500, fadeOutDuration: 500 });
    // Halfway into step 1: column 1 fading in, column 0 fading out.
    expect(apply(pattern, 1250)).toEqual([255, 0, 0, 128, 0, 0, 128]);
  });

  it("does not change the base", () => {
    apply(chase(), 0);
    expect(base.f1).toEqual([255, 255, 0, 0, 255, 0, 0]);
  });

  it("skips unknown effects, missing grids and missing fixtures", () => {
    expect(apply(chase({ effect: "doesNotExist" }), 0)).toEqual(base.f1);
    expect(apply({ ...chase(), grid: null }, 0)).toEqual(base.f1);
    const ghost: Grid = { cols: 1, rows: 1, cells: [{ col: 0, row: 0, head: 0, fixtureId: "gone" }] };
    expect(apply({ ...chase(), grid: ghost }, 0)).toEqual(base.f1);
    const badHead: Grid = { cols: 1, rows: 1, cells: [{ col: 0, row: 0, head: 9, fixtureId: "f1" }] };
    expect(apply({ ...chase(), grid: badHead }, 0)).toEqual(base.f1);
  });

  it("respects the selectable's fixtureIds", () => {
    expect(apply(chase({ fixtureIds: ["other"] }), 0)).toEqual(base.f1);
  });
});

describe("getNextPatternChangeDelay", () => {
  it("waits for the next step without fades", () => {
    expect(getNextPatternChangeDelay([chase()], 300)).toBe(700);
  });
  it("ticks every frame during a fade, then waits for the next step", () => {
    const pattern = chase({ fadeInDuration: 200 });
    expect(getNextPatternChangeDelay([pattern], 1100)).toBeLessThan(50);
    expect(getNextPatternChangeDelay([pattern], 1300)).toBe(700);
  });
  it("never ticks without patterns", () => {
    expect(getNextPatternChangeDelay([], 0)).toBe(Infinity);
  });
});
