// Convert DMX values into visualiser-understandable-structure

import type { HeadState } from "../components/Visualiser3D-v2/Elements/Visualiser3DFixture";
import { ChannelRole, ChannelType, type Channel, type FixtureTemplate } from "../types-v2/fixtureTemplates";

/**
 * What a set of channels says about a beam. Undefined = these channels don't control it.
 * The same shape is decoded for the fixture ("main") level and for each head, so a new attribute (pan, tilt, gobo, ...)
 * is added here once and works on both levels.
 */
type BeamAttributes = {
  /** Linear 0–255 per component, before any dimmer. Can be dark (e.g. a dimmerless fixture at 50%). */
  rgb?: [number, number, number];
  /** 0–1 */
  dimmer?: number;
};

/**
 * Convert DMX values into something each head can understand.
 * A head only needs a colour and an intensity.
 *
 * Note that we need to "downmix" the colour into Hex.
 *
 * Two levels, decoded by the same engine:
 * - main: channels outside every head, plus any MASTER_DIMMER (the channel type decides, not head membership).
 * - head: each head's own channels, minus MASTER_DIMMER.
 * Then each head is combined with main: dimmers multiply, colour comes from the head if it has one, else from main.
 *
 * Returns one state per head, in the same order as `getHeadLayouts`. Returns [] if the template or mode is missing,
 * so the fixture falls back to its default look
 *
 * Example input: 200  255 0 255 0   255 0 255 0   255 0 255 0   255 0 255 0
 * Example output:
 *   [
 *      { colour: "#ff00ff", intensity: 78 },
 *      { colour: "#ff00ff", intensity: 78 },
 *      { colour: "#ff00ff", intensity: 78 },
 *      { colour: "#ff00ff", intensity: 78 },
 *   ]
 *
 * @param dmxValues one per slot of the mode (`null` = unset, uses the channel's default)
 * @param fixtureTemplate
 * @param modeId
 */
export const decodeHeadStates = (
  dmxValues: (number | null)[],
  fixtureTemplate: FixtureTemplate | undefined,
  modeId: string,
): HeadState[] => {
  const decoder = getHeadDecoder(fixtureTemplate, modeId);
  if (!decoder) return [];
  const colours = decoder.createOutput();
  decoder.decode(dmxValues, colours);
  return colours.map(({ r, g, b, intensity }) => ({ colour: toHex(r, g, b), intensity }));
};

/** What one head shows, as numbers: the colour at full brightness (0–255 each, rounded) and intensity 0–100. */
export type HeadColour = { r: number; g: number; b: number; intensity: number };

/**
 * decodeHeadStates split in two: the channel lookups are done once per template + mode (cached), and `decode` only
 * reads values, writing into `out` without building strings. For decoding every frame.
 */
export type HeadDecoder = {
  headCount: number;
  /** One HeadColour per head, to pass to `decode`. */
  createOutput: () => HeadColour[];
  decode: (dmxValues: (number | null)[], out: HeadColour[]) => void;
};

const decoderCache = new WeakMap<FixtureTemplate, Map<string, HeadDecoder | null>>();

/** Null if the template or mode is missing. */
export const getHeadDecoder = (fixtureTemplate: FixtureTemplate | undefined, modeId: string): HeadDecoder | null => {
  if (!fixtureTemplate) return null;
  let byMode = decoderCache.get(fixtureTemplate);
  if (!byMode) {
    byMode = new Map();
    decoderCache.set(fixtureTemplate, byMode);
  }
  if (!byMode.has(modeId)) byMode.set(modeId, compileHeadDecoder(fixtureTemplate, modeId));
  return byMode.get(modeId)!;
};

const compileHeadDecoder = (fixtureTemplate: FixtureTemplate, modeId: string): HeadDecoder | null => {
  const mode = fixtureTemplate.modes.find((m) => m.id === modeId);
  if (!mode) return null;

  const channelsById = new Map(fixtureTemplate.channels.map((c) => [c.id, c]));
  const channelAt = (slot: number) => channelsById.get(mode.channelIds[slot]);
  const isMasterDimmer = (slot: number) => channelAt(slot)?.type === ChannelType.MASTER_DIMMER;

  // Slots per head. No heads = one head with every channel (QLC+ behaviour, same as getHeadLayouts).
  const allSlots = mode.channelIds.map((_, i) => i);
  const headSlots = mode.heads.length > 0 ? mode.heads.map((h) => h.channelIndexes) : [allSlots];
  const inAHead = new Set(headSlots.flat());

  const main = compileLevel(
    allSlots.filter((s) => !inAHead.has(s) || isMasterDimmer(s)),
    channelAt,
  );
  const heads = headSlots.map((slots) =>
    compileLevel(
      slots.filter((s) => !isMasterDimmer(s)),
      channelAt,
    ),
  );

  return {
    headCount: heads.length,
    createOutput: () => heads.map(() => ({ r: 0, g: 0, b: 0, intensity: 0 })),
    decode: (dmxValues, out) => {
      const mainAttributes = decodeLevel(main, dmxValues);
      heads.forEach((head, i) => writeHeadColour(combine(mainAttributes, decodeLevel(head, dmxValues)), out[i]));
    },
  };
};

/** One level's channels: the first coarse channel of each type, with what reading it needs. */
type CompiledLevel = { slot: number; type: ChannelType; reversed: boolean; defaultValue: number }[];

/**
 * Given a set of channel indexes (example: channel 2 3 4), which channels say something about the beam.
 * Done 1 + # heads times per template + mode: one for the main level, then one for each head.
 */
const compileLevel = (slots: number[], channelAt: (slot: number) => Channel | undefined): CompiledLevel => {
  // First coarse channel of each type wins (several of the same type in one level is rare).
  const seen = new Set<ChannelType>();
  const level: CompiledLevel = [];
  for (const slot of slots) {
    const channel = channelAt(slot);
    // ignore fine channels
    if (!channel || channel.role === ChannelRole.FINE || seen.has(channel.type)) continue;
    seen.add(channel.type);
    level.push({ slot, type: channel.type, reversed: !!channel.reversed, defaultValue: channel.defaultValue ?? 0 });
  }
  return level;
};

const decodeLevel = (level: CompiledLevel, dmxValues: (number | null)[]): BeamAttributes => {
  const values = new Map<ChannelType, number>();
  for (const { slot, type, reversed, defaultValue } of level) {
    // null = unset: the fixture sits at the channel's default.
    const raw = dmxValues[slot] ?? defaultValue;
    values.set(type, reversed ? 255 - raw : raw);
  }
  return decodeAttributes(values);
};

/** The beam attributes from one level's channel values (first coarse channel of each type). */
const decodeAttributes = (values: Map<ChannelType, number>): BeamAttributes => {
  const result: BeamAttributes = {};

  // Dimmer: master or head, whichever this level has. `slots` already decides which one belongs here.
  const dimmer = values.get(ChannelType.MASTER_DIMMER) ?? values.get(ChannelType.DIMMER);
  if (dimmer !== undefined) result.dimmer = dimmer / 255;

  result.rgb = decodeColour(values);
  return result;
};

/**
 * Colour channels → linear RGB (0–255). Undefined if this level has no colour channels.
 * - Additive (RGB, white, amber, lime, UV, indigo): add each emitter's tint.
 * - CMY only: subtractive from white, the reverse of the resolver (r = 255 - c).
 */
const decodeColour = (values: Map<ChannelType, number>): [number, number, number] | undefined => {
  const additive = Object.keys(EMITTER_TINTS).filter((t) => values.has(t as ChannelType)) as ChannelType[];
  if (additive.length > 0) {
    const rgb: [number, number, number] = [0, 0, 0];
    for (const type of additive) {
      const level = values.get(type)! / 255;
      const tint = EMITTER_TINTS[type as keyof typeof EMITTER_TINTS];
      for (let i = 0; i < 3; i++) rgb[i] += tint[i] * level;
    }
    return rgb.map((v) => Math.min(v, 255)) as [number, number, number];
  }

  const hasCmy = [ChannelType.CYAN, ChannelType.MAGENTA, ChannelType.YELLOW].some((t) => values.has(t));
  if (hasCmy) {
    return [
      255 - (values.get(ChannelType.CYAN) ?? 0),
      255 - (values.get(ChannelType.MAGENTA) ?? 0),
      255 - (values.get(ChannelType.YELLOW) ?? 0),
    ];
  }

  return undefined;
};

/**
 * What each emitter adds at full level. RGB and white are exact; the others are rough looks for the preview only
 * (the real colour depends on the fixture's LEDs).
 */
const EMITTER_TINTS = {
  [ChannelType.RED]: [255, 0, 0],
  [ChannelType.GREEN]: [0, 255, 0],
  [ChannelType.BLUE]: [0, 0, 255],
  [ChannelType.WHITE]: [255, 255, 255],
  [ChannelType.AMBER]: [255, 150, 0],
  [ChannelType.LIME]: [190, 255, 0],
  [ChannelType.UV]: [90, 0, 255],
  [ChannelType.INDIGO]: [75, 0, 200],
} as const satisfies Partial<Record<ChannelType, readonly [number, number, number]>>;

/**
 * Head + main → what the head shows.
 * - dimmer: multiply (a missing dimmer counts as fully open).
 * - colour: the head's own if it has colour channels, else main's.
 */
const combine = (main: BeamAttributes, head: BeamAttributes): BeamAttributes => ({
  dimmer: (main.dimmer ?? 1) * (head.dimmer ?? 1),
  rgb: head.rgb ?? main.rgb,
});

/**
 * HeadState wants the colour at full brightness plus a separate intensity, so split the brightness out of the colour:
 * a dimmerless head at half red (128, 0, 0) becomes #ff0000 at 50%, not a dark red at 100%.
 * No colour channels at all (a plain dimmer) = white.
 */
const writeHeadColour = ({ rgb = [255, 255, 255], dimmer = 1 }: BeamAttributes, out: HeadColour) => {
  const peak = Math.max(rgb[0], rgb[1], rgb[2]);
  if (peak <= 0) {
    out.r = out.g = out.b = out.intensity = 0;
    return;
  }
  out.r = Math.round((rgb[0] / peak) * 255);
  out.g = Math.round((rgb[1] / peak) * 255);
  out.b = Math.round((rgb[2] / peak) * 255);
  out.intensity = Math.round(dimmer * (peak / 255) * 100);
};

const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
