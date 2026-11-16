import { describe, expect, it } from "vitest";
import { ChannelType, type Channel, type FixtureTemplate } from "../../types-v2/fixtureTemplates";
import { blendFadeValues, getFadeProfile, resolveFadeValues } from "../visualiser-v2-fade";

const channel = (id: string, type: ChannelType, defaultValue = 0) =>
  ({ id, name: id, type, defaultValue, role: "COARSE", capabilities: [] }) as Channel;

// Like the Nanlite FC-120B: dimmer, CCT macro, maintenance, strobe. Plus a red channel with a default.
const template = {
  channels: [
    channel("dim", ChannelType.MASTER_DIMMER),
    channel("cct", ChannelType.COLOUR_WHEEL),
    channel("maint", ChannelType.CUSTOM),
    channel("strobe", ChannelType.CUSTOM),
    channel("red", ChannelType.RED, 100),
  ],
  modes: [{ id: "m1", name: "Mode", channelIds: ["dim", "cct", "maint", "strobe", "red"], heads: [] }],
} as unknown as FixtureTemplate;

describe("cue fades", () => {
  const profile = getFadeProfile(template, "m1")!;

  it("profiles which slots fade, and caches per template + mode", () => {
    expect(profile.fades).toEqual([true, false, false, false, true]);
    expect(profile.defaults).toEqual([0, 0, 0, 0, 100]);
    expect(getFadeProfile(template, "m1")).toBe(profile);
    expect(getFadeProfile(template, "missing")).toBeNull();
    expect(getFadeProfile(undefined, "m1")).toBeNull();
  });

  it("resolves unset slots to the channel default, and no values to off", () => {
    expect(resolveFadeValues([255, null, 0, 0, null], profile)).toEqual([255, 0, 0, 0, 100]);
    expect(resolveFadeValues(undefined, profile)).toEqual([0, 0, 0, 0, 0]);
  });

  it("fades dimmer and colour mixing, snaps the rest at the start", () => {
    const from = [0, 0, 0, 0, 0];
    const out: number[] = [];
    blendFadeValues(out, from, [200, 170, 0, 50, 255], profile, 0.5);
    expect(out).toEqual([100, 170, 0, 50, 127.5]);
  });

  it("ends exactly on the target, with nulls resolved", () => {
    const out: number[] = [];
    blendFadeValues(out, [255, 0, 0, 0, 0], [0, null, null, null, null], profile, 1);
    expect(out).toEqual([0, 0, 0, 0, 100]);
  });

  it("starts exactly on `from` for fading slots", () => {
    const out: number[] = [];
    blendFadeValues(out, [10, 0, 0, 0, 20], [200, 85, 0, 0, 255], profile, 0);
    expect(out).toEqual([10, 85, 0, 0, 20]);
  });
});
