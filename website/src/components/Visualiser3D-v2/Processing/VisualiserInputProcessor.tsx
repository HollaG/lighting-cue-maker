// this file handles parsing to DMX values.

import { useEffect, useMemo } from "react";
import { useGetCue } from "../../../query-v2/cues/useGetCue";
import { useAppStore } from "../../../store/appStore";
import type { Cue } from "../../../types-v2/cue";
import type { PatchedFixture } from "../../../types-v2/patchedFixture";
import type { Visualiser } from "../../../types-v2/visualiser";
import { StaticVisualiser3D } from "../Visualiser3D";
import { useGetEvent } from "../../../query-v2/events/useGetEvent";
import { ChannelType, type FixtureTemplate } from "../../../types-v2/fixtureTemplates";
import type { FixtureGroup } from "../../../types-v2/fixtureGroups";
import { SelectableType, type OptionSet, type Selectable } from "../../../types-v2/optionSet";
import { useGetVisualiserData } from "../../../query-v2/visualiser-data/useGetVisualiserData";
import { Logger } from "../../../utils/logger";

const logger = new Logger("VisualiserInputProcessor", "cyan");

export const VisualiserInputProcessor = ({
  visualiser,
  eventId,
  fixtures,
}: {
  // Visualiser-required stuff
  visualiser: Visualiser;
  eventId: string;
  fixtures: PatchedFixture[];
}) => {
  const currentlySelectedCueId = useAppStore((state) => state.currentlySelectedCueId);
  const activeItemId = useAppStore((state) => state.activeItemId);

  const { visualiserData } = useGetVisualiserData(eventId);

  const { cue } = useGetCue(eventId, activeItemId, currentlySelectedCueId);

  // Derived from the cue + setup data, so no state needed. Only recomputed when one of those changes.
  const dmxValues = useMemo(() => {
    if (!cue || !visualiserData) return null;

    return getDmxValues({
      cue,
      fixtures,
      fixtureGroups: visualiserData.fixtureGroups,
      fixtureTemplates: visualiserData.fixtureTemplates,
      optionSetsByGroupId: visualiserData.optionSetsByGroupId,
    });
  }, [cue, fixtures, visualiserData]);

  useEffect(() => {
    logger.debug("dmx values", dmxValues);
  }, [dmxValues]);

  return (
    <StaticVisualiser3D
      key={visualiser.id}
      visualiser={visualiser}
      eventId={eventId}
      fixtures={fixtures}
      dmxValuesByFixtureId={dmxValues ?? undefined}
    />
  );
};
type ResolverInput = {
  cue: Cue;
  fixtures: PatchedFixture[];
  fixtureTemplates: FixtureTemplate[];
  fixtureGroups: FixtureGroup[];

  // option sets grouped by fixture group ID. This allows us
  optionSetsByGroupId: Record<string, OptionSet[]>;
};

const getDmxValues = (input: ResolverInput): { [fixtureId: string]: (number | null)[] } => {
  const { cue, fixtures, fixtureTemplates, fixtureGroups, optionSetsByGroupId } = input;

  // Initialize the result object
  const dmxValues: { [fixtureId: string]: (number | null)[] } = {};

  // --- Phase 0 ---------
  // Data cleaning
  /** each fixture gets [[0, 1, 2], [3,4,5]]
   *  one inner array per head; each number is a position in the mode's `channelIds list` (= the DMX slot).
   * */
  const headsWithChannelIndexes: { [fixtureId: string]: number[][] } = {};
  for (const fixture of fixtures) {
    const selectedMode = fixtureTemplates
      .find((ft) => ft.id === fixture.fixtureTemplateId)
      ?.modes.find((mode) => mode.id === fixture.modeId);

    if (!selectedMode) {
      console.warn(`Fixture mode not found for fixture ${fixture.id}`);
      continue;
    }

    headsWithChannelIndexes[fixture.id] =
      selectedMode.heads.length > 0
        ? selectedMode.heads.map((head) => head.channelIndexes) // already mode positions
        : [selectedMode.channelIds.map((_, i) => i)]; // no heads = one head with every channel
  }

  // --- Phase 1 ---------
  // Getting the list of selectables, in write order (higher priority later).
  // Each one remembers its group, so Phase 2 can keep only the ones for a given fixture without re-sorting.
  const selectables: { selectable: Selectable; fixtureGroupId: string }[] = [];

  // Walk the groups in their own order (sortOrder). An object's key order means nothing, so don't loop over
  // optionSetsByGroupId directly. Copy before sorting: `sort` changes the array in place.
  for (const fixtureGroup of [...fixtureGroups].sort((a, b) => a.sortOrder - b.sortOrder)) {
    // Ignore if this fixture group is disabled
    if (cue.activeFixtureGroupIds && !cue.activeFixtureGroupIds.includes(fixtureGroup.id)) {
      continue;
    }

    const optionSets = optionSetsByGroupId[fixtureGroup.id] ?? []; // a group without option sets has no key

    // Sort the option sets in each fixture group by priority, highest is later.
    // Copy first: this array belongs to React Query's cache, and sorting it in place would change the cached data.
    const sortedOptionSets = [...optionSets].sort((a, b) => a.priority - b.priority);

    // For each option set, add the selectables that are selected.
    for (const optionSet of sortedOptionSets) {
      for (const selectable of optionSet.selectables) {
        if (cue.selectableIds.includes(selectable.id)) {
          selectables.push({ selectable, fixtureGroupId: fixtureGroup.id });
        }
      }
    }
  }

  // --- Phase 2 ---------
  // Now, we have the list of selectables, with the higher priority ones at the back
  // Iterate through the fixtures

  for (const fixture of fixtures) {
    // Get the fixture template for this fixture
    const fixtureTemplate = fixtureTemplates.find((ft) => ft.id === fixture.fixtureTemplateId);

    // The selectables for this fixture: from groups it's in, and not limited to other fixtures.
    // Filtering Phase 1's list keeps its order, so the last one is still the highest priority.
    const groupIdsThatThisFixtureIsIn = new Set(
      fixtureGroups.filter((fg) => fg.fixtureIds.includes(fixture.id)).map((fg) => fg.id),
    );
    const selectableList = selectables
      .filter(
        ({ selectable, fixtureGroupId }) =>
          groupIdsThatThisFixtureIsIn.has(fixtureGroupId) &&
          (selectable.fixtureIds === "all" || selectable.fixtureIds.includes(fixture.id)),
      )
      .map(({ selectable }) => selectable);

    if (!fixtureTemplate) {
      console.warn(`Fixture template not found for fixture ${fixture.id}`);
      continue;
    }

    const fixtureMode = fixtureTemplate.modes.find((mode) => mode.id === fixture.modeId);

    if (!fixtureMode) {
      console.warn(`Fixture mode not found for fixture ${fixture.id}`);
      continue;
    }

    // Initialize a null array of length channelIds.length [null null null ... null]
    const fixtureDmxValues: (number | null)[] = new Array(fixtureMode.channelIds.length).fill(null);

    // The ChannelType at a DMX slot (a position in the mode's channelIds).
    const channelsById = new Map(fixtureTemplate.channels.map((c) => [c.id, c]));
    const typeAt = (slot: number) => channelsById.get(fixtureMode.channelIds[slot])?.type;

    // --- Color selectable application ---
    {
      const colourSelectables = selectableList.filter((s) => s.type === SelectableType.COLOUR);
      if (colourSelectables.length !== 0) {
        const selectableToApply = colourSelectables[colourSelectables.length - 1]; // last one is highest priority
        for (const headChannelIndexes of headsWithChannelIndexes[fixture.id] ?? []) {
          // [color] Test: does the head have every channel set in Mix?

          if (selectableToApply.colour.mix) {
            const allChannelsExist = Object.keys(selectableToApply.colour.mix).every((colorKey) => {
              const channelTypeToFind = ColorMixToChannelType[colorKey as keyof typeof ColorMixToChannelType];

              // check the head's channels
              return headChannelIndexes.some((i) => typeAt(i) === channelTypeToFind);
            });

            // if yes, then apply the mix, and all other values are null.

            if (allChannelsExist) {
              // CASE 1: There is Mix, and all channels in Mix exist.

              // Apply the color mix
              // first, set all other color channel values to 0.
              for (const channelIndex of headChannelIndexes) {
                const channelType = typeAt(channelIndex);
                if (channelType && ColorChannelTypes.includes(channelType)) {
                  fixtureDmxValues[channelIndex] = 0;
                }
              }

              // then, set the values that we need, on this head's channels only
              for (const [colorKey, value] of Object.entries(selectableToApply.colour.mix)) {
                const channelTypeToFind = ColorMixToChannelType[colorKey as keyof typeof ColorMixToChannelType];
                // headChannelIndexes are already DMX slots, so the slot we find is the one to write
                const channelIndex = headChannelIndexes.find((i) => typeAt(i) === channelTypeToFind);
                if (channelIndex !== undefined) {
                  fixtureDmxValues[channelIndex] = value;
                }
              }
            } else {
              // Case 2: There is Mix, but not all channels in Mix exist - simply apply Hex
              // apply based on hex
              const availableTypes = headChannelIndexes.map(typeAt).filter((t): t is ChannelType => !!t);
              const colors = getColourFromHex(selectableToApply.colour.hex, availableTypes);
              // apply to the head's channels only
              for (const channelIndex of headChannelIndexes) {
                const channelType = typeAt(channelIndex);
                if (channelType && colors[channelType] !== undefined) {
                  fixtureDmxValues[channelIndex] = colors[channelType];
                }
              }
            }
          } else {
            // Case 3: There is no Mix, apply based on Hex
            // apply based on hex
            const availableTypes = headChannelIndexes.map(typeAt).filter((t): t is ChannelType => !!t);
            const colors = getColourFromHex(selectableToApply.colour.hex, availableTypes);
            // apply to the head's channels only
            for (const channelIndex of headChannelIndexes) {
              const channelType = typeAt(channelIndex);
              if (channelType && colors[channelType] !== undefined) {
                fixtureDmxValues[channelIndex] = colors[channelType];
              }
            }
          }
        }
      }
    }

    // TO IMPLEMENT: Head Intensity selectors. Write the code here when impelemented.

    // --- Intensity selectable application ---
    // IMPORTANT NOTE: If multiple fixture groups affect the intensity, according to HTP rules,
    // the highest value is taken.
    if (selectableList.some((s) => s.type === SelectableType.INTENSITY)) {
      const valueToWrite = Math.round(
        (selectableList
          .filter((s) => s.type === SelectableType.INTENSITY)
          .map((s) => s.percent)
          .reduce((max, current) => Math.max(max, current), 0) /
          100) *
          255,
      );

      // second note: No need to worry about heads for intensity.
      // Case 1: Master Intensity exists in this mode
      const modeTypes = fixtureMode.channelIds.map((id) => channelsById.get(id)?.type);

      if (modeTypes.includes(ChannelType.MASTER_DIMMER)) {
        const masterIntensityChannelIndex = fixtureMode.channelIds.findIndex(
          (channelId) => channelsById.get(channelId)?.type === ChannelType.MASTER_DIMMER,
        );
        if (masterIntensityChannelIndex !== -1) {
          fixtureDmxValues[masterIntensityChannelIndex] = valueToWrite;
        }
      } else if (modeTypes.includes(ChannelType.DIMMER)) {
        // Case 2: No Master Intensity, but one or more dimmers exist
        // write to all dimmer channels:
        // if there is a value already, multiply it
        // if there is no value, write the new value
        // Look in the mode's slots (not the template's channels): only those exist in the DMX output.
        fixtureMode.channelIds.forEach((channelId, slot) => {
          if (channelsById.get(channelId)?.type !== ChannelType.DIMMER) return;
          const current = fixtureDmxValues[slot];
          fixtureDmxValues[slot] = current === null ? valueToWrite : Math.round((current * valueToWrite) / 255); // scale: e.g. 200 at 50% → 100
        });
      } else {
        // Case 3: No master intensity, no dimmer, but RGB channels exist: scale them down
        // Iterate through all channels which are color. Apply a scale if value not null, else ignore.
        fixtureMode.channelIds.forEach((channelId, slot) => {
          const channelType = channelsById.get(channelId)?.type;
          if (!channelType || !ColorChannelTypes.includes(channelType)) return;
          const current = fixtureDmxValues[slot];
          fixtureDmxValues[slot] = current === null ? null : Math.round((current * valueToWrite) / 255); // scale: e.g. 200 at 50% → 100
        });
      }
    }

    dmxValues[fixture.id] = fixtureDmxValues;
  }

  return dmxValues;
};

const ColorMixToChannelType = {
  r: ChannelType.RED,
  g: ChannelType.GREEN,
  b: ChannelType.BLUE,
  white: ChannelType.WHITE,
  amber: ChannelType.AMBER,
  uv: ChannelType.UV,
  lime: ChannelType.LIME,
  indigo: ChannelType.INDIGO,
};

const ColorChannelTypes: ChannelType[] = [
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
];

/**
 * Turns a hex colour into values for the colour channels a head has (DMX 0–255).
 * Only colour channel types in `availableChannels` get a key; anything else (dimmers, pan, ...) is left out.
 *
 * - RGB: copied straight from the hex.
 * - RGBW: the white part (the lowest of r, g, b) goes to the white channel and is taken out of r, g, b.
 * - CMY: subtractive, like QLC+: c = 255 - r, m = 255 - g, y = 255 - b.
 * - Amber, UV, lime, indigo: 0. A hex can't say how much of them to use; that's what `mix` is for.
 *   White on a head without RGB is 0 too.
 */
const getColourFromHex = (hex: string, availableChannels: ChannelType[]): { [key in ChannelType]?: number } => {
  const rgb = parseHex(hex);
  if (!rgb) {
    console.warn(`Invalid colour hex "${hex}"`);
    return {};
  }
  let [r, g, b] = rgb;

  const has = (type: ChannelType) => availableChannels.includes(type);
  const hasRgb = has(ChannelType.RED) && has(ChannelType.GREEN) && has(ChannelType.BLUE);

  const result: { [key in ChannelType]?: number } = {};

  // RGBW: move the shared white part onto the white channel.
  if (has(ChannelType.WHITE)) {
    const white = hasRgb ? Math.min(r, g, b) : 0;
    result[ChannelType.WHITE] = white;
    r -= white;
    g -= white;
    b -= white;
  }

  // Set each RGB channel the head has, even if it only has some of them.
  if (has(ChannelType.RED)) result[ChannelType.RED] = r;
  if (has(ChannelType.GREEN)) result[ChannelType.GREEN] = g;
  if (has(ChannelType.BLUE)) result[ChannelType.BLUE] = b;

  // CMY uses the original hex, not the values after white extraction.
  const [origR, origG, origB] = rgb;
  if (has(ChannelType.CYAN)) result[ChannelType.CYAN] = 255 - origR;
  if (has(ChannelType.MAGENTA)) result[ChannelType.MAGENTA] = 255 - origG;
  if (has(ChannelType.YELLOW)) result[ChannelType.YELLOW] = 255 - origB;

  // Specials: the hex says nothing about them.
  for (const type of [ChannelType.AMBER, ChannelType.UV, ChannelType.LIME, ChannelType.INDIGO]) {
    if (has(type)) result[type] = 0;
  }

  return result;
};

/** "#rrggbb", "rrggbb", "#rgb" or "rgb" → [r, g, b] (0–255), or null if it isn't a valid hex colour. */
const parseHex = (hex: string): [number, number, number] | null => {
  let h = hex.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.replace(/./g, (c) => c + c); // "f80" → "ff8800"
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  const n = parseInt(h, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
};
