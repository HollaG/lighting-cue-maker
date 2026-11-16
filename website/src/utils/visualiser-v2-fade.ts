// Cue fades in DMX space: blends one fixture's channel values from what was showing to the new cue's values.
// Pure: no React, no clocks. CueFadeRunner calls these once per frame while a fade runs.

import { ChannelType, type FixtureTemplate } from "../types-v2/fixtureTemplates";

/** Per slot of a fixture's mode: the value an unset (`null`) slot sits at, and whether the slot fades or snaps. */
export type FadeProfile = { defaults: number[]; fades: boolean[] };

/**
 * Channels that slide smoothly between values. Everything else (colour wheel / CCT macros, gobos, prisms, shutter and
 * strobe, custom channels) works in ranges where an in-between value means something else, so it snaps to the new
 * value at the start of the fade.
 */
const FADING_CHANNEL_TYPES = new Set<ChannelType>([
  ChannelType.MASTER_DIMMER,
  ChannelType.DIMMER,
  ChannelType.RED,
  ChannelType.GREEN,
  ChannelType.BLUE,
  ChannelType.WHITE,
  ChannelType.AMBER,
  ChannelType.UV,
  ChannelType.LIME,
  ChannelType.INDIGO,
  ChannelType.CYAN,
  ChannelType.MAGENTA,
  ChannelType.YELLOW,
  ChannelType.PAN,
  ChannelType.TILT,
  ChannelType.ZOOM,
  ChannelType.FOCUS,
  ChannelType.IRIS,
]);

const profileCache = new WeakMap<FixtureTemplate, Map<string, FadeProfile | null>>();

/** Null if the template or mode is missing. Cached per template + mode. */
export const getFadeProfile = (fixtureTemplate: FixtureTemplate | undefined, modeId: string): FadeProfile | null => {
  if (!fixtureTemplate) return null;
  let byMode = profileCache.get(fixtureTemplate);
  if (!byMode) {
    byMode = new Map();
    profileCache.set(fixtureTemplate, byMode);
  }
  if (!byMode.has(modeId)) byMode.set(modeId, compileFadeProfile(fixtureTemplate, modeId));
  return byMode.get(modeId)!;
};

const compileFadeProfile = (fixtureTemplate: FixtureTemplate, modeId: string): FadeProfile | null => {
  const mode = fixtureTemplate.modes.find((m) => m.id === modeId);
  if (!mode) return null;
  const channelsById = new Map(fixtureTemplate.channels.map((c) => [c.id, c]));
  const channels = mode.channelIds.map((id) => channelsById.get(id));
  return {
    defaults: channels.map((channel) => channel?.defaultValue ?? 0),
    fades: channels.map((channel) => !!channel && FADING_CHANNEL_TYPES.has(channel.type)),
  };
};

/** Slot `slot` of `values` as a number: `null` = the channel's default, no values at all = 0 (off). */
const valueAt = (values: readonly (number | null)[] | undefined, profile: FadeProfile, slot: number): number => {
  if (!values) return 0;
  return values[slot] ?? profile.defaults[slot];
};

/** A copy of `values` with every slot as a number (see valueAt). The start point of a fade. */
export const resolveFadeValues = (values: readonly (number | null)[] | undefined, profile: FadeProfile): number[] =>
  resolveFadeValuesInto([], values, profile);

/** resolveFadeValues into an existing array, for a start point that keeps moving (an outgoing effect), per frame. */
export const resolveFadeValuesInto = (
  out: number[],
  values: readonly (number | null)[] | undefined,
  profile: FadeProfile,
): number[] => {
  for (let slot = 0; slot < profile.defaults.length; slot++) out[slot] = valueAt(values, profile, slot);
  return out;
};

/**
 * Writes the fade's state at `progress` (0–1) into `out`: fading slots go in a straight line from `from` to `to`,
 * the others are already at `to`. At progress 1, `out` is exactly `to` (with nulls resolved).
 * `to` is read fresh every frame, so a target that moves (a pattern effect) is followed.
 */
export const blendFadeValues = (
  out: number[],
  from: readonly number[],
  to: readonly (number | null)[] | undefined,
  profile: FadeProfile,
  progress: number,
) => {
  for (let slot = 0; slot < profile.defaults.length; slot++) {
    const target = valueAt(to, profile, slot);
    out[slot] = profile.fades[slot] ? from[slot] + (target - from[slot]) * progress : target;
  }
};
