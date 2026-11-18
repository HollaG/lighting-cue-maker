import { Box, Center, Stack, Text } from "@mantine/core";
import { memo, useMemo } from "react";
import type { Channel, FixtureTemplate } from "../../types-v2/fixtureTemplates";
import type { PatchedFixture } from "../../types-v2/patchedFixture";
import { hasPaletteColour } from "../../utils/visualiser-v2-decoder";
import { CardBase } from "../Cues/CardBase";
import { DMXControl } from "./DMXControl/DMXControl";
import { PaletteColourButton } from "./PaletteColourButton";

type DMXFixtureProps = {
  fixture: PatchedFixture;
  /** Undefined = the template is missing: shows an error card. */
  fixtureTemplate: FixtureTemplate | undefined;
  /** This fixture's values, one per slot of its mode. */
  dmxValues: (number | null)[] | undefined;
  /** This fixture's overrides in the cue, by channel id. */
  overrides: Record<string, number> | undefined;
  isActive: boolean;
  /** Must be stable (same function every render), or every card re-renders. */
  onCommit: (fixtureId: string, channelId: string, value: number) => void;
  /** Several channels in one save (e.g. a head's colour). Must be stable. */
  onCommitMany: (fixtureId: string, valuesByChannelId: Record<string, number>) => void;
  /** Must be stable (same function every render), or every card re-renders. */
  onClear: (fixtureId: string, channelId: string) => void;
  /** Must be stable. Registers the card's element, for scrolling it into view. */
  registerCard: (fixtureId: string, el: HTMLDivElement | null) => void;
};

/**
 * One fixture's card in the DMX drawer: its name, palette buttons and a slider per channel.
 *
 * Memoized: changing cue or selection re-renders only the cards whose values, overrides or `isActive` changed.
 */
export const DMXFixture = memo(function DMXFixture({
  fixture,
  fixtureTemplate,
  dmxValues,
  overrides,
  isActive,
  onCommit,
  onCommitMany,
  onClear,
  registerCard,
}: DMXFixtureProps) {
  const channels = useMemo(
    () => (fixtureTemplate ? getChannelsForFixture(fixture, fixtureTemplate) : []),
    [fixture, fixtureTemplate],
  );
  // one entry per head: show the picker if any head can mix colour
  const colourHeads = useMemo(
    () => (!!fixtureTemplate ? hasPaletteColour(fixtureTemplate, fixture.modeId) : []),
    [fixtureTemplate, fixture.modeId],
  );
  const canPickColour = colourHeads.some((head) => head.has);

  if (!fixtureTemplate) {
    return (
      <Center style={{ flex: "0 0 auto", minHeight: 0, width: "6rem" }}>
        <Text c="red" size="xs">
          Fixture template not found
        </Text>
      </Center>
    );
  }

  return (
    <Box ref={(el) => registerCard(fixture.id, el)} style={{ display: "flex", flex: "0 0 auto", minHeight: 0 }}>
      <CardBase
        isActive={isActive}
        style={{
          flex: "0 0 auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
          gap: "var(--mantine-spacing-xs)",
        }}
      >
        {/* Vertical name, reading bottom → top. Long names are cut with "…"; the full name shows on hover. */}
        <Text
          title={fixture.name}
          style={{
            writingMode: "vertical-lr",
            transform: "rotate(180deg)",
            flex: "0 1 auto",
            maxHeight: "100%",
            minHeight: 0, // allow it to be shorter than the full name
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            fontSize: "1rem",
            marginTop: "auto",
          }}
        >
          {fixture.name}
        </Text>

        {/* Palette selectors */}
        {fixture.allowUserOverride && canPickColour && (
          <Stack justify="flex-end">
            <PaletteColourButton
              title={`Colour for ${fixture.name}`}
              colourHeads={colourHeads}
              // whiteHeads TODO
              // slots → channel ids (`channels` is in slot order)
              onApply={(valuesBySlot) =>
                onCommitMany(
                  fixture.id,
                  Object.fromEntries([...valuesBySlot].map(([slot, value]) => [channels[slot].id, value])),
                )
              }

              headGrid={{
                columns: fixtureTemplate.properties?.columns ?? 1,
                rows: fixtureTemplate.properties?.rows ?? 1,
              }}
            />
          </Stack>
        )}

        {fixture.allowUserOverride ? (
          channels.map((channel, index) => (
            <DMXControl
              key={channel.id}
              channel={channel}
              dmxValue={dmxValues?.[index] ?? null}
              onClear={() => onClear(fixture.id, channel.id)}
              onCommit={(channelId, value) => onCommit(fixture.id, channelId, value)}
              overrideValue={overrides?.[channel.id]}
            />
          ))
        ) : (
          <Center>
            <Text style={{ fontSize: "0.8rem", textAlign: "center", maxWidth: "6rem" }}>
              Custom settings cannot be set for this fixture.
            </Text>
          </Center>
        )}
      </CardBase>
    </Box>
  );
}, arePropsEqual);

/**
 * Like memo's default (every prop by ===), except `dmxValues`: the resolver builds a new array for every fixture on
 * each cue change, so compare its items. A fixture whose values didn't change then skips re-rendering.
 */
function arePropsEqual(prev: DMXFixtureProps, next: DMXFixtureProps) {
  return (
    prev.fixture === next.fixture &&
    prev.fixtureTemplate === next.fixtureTemplate &&
    prev.overrides === next.overrides &&
    prev.isActive === next.isActive &&
    prev.onCommit === next.onCommit &&
    prev.onCommitMany === next.onCommitMany &&
    prev.onClear === next.onClear &&
    prev.registerCard === next.registerCard &&
    sameValues(prev.dmxValues, next.dmxValues)
  );
}

const sameValues = (a: (number | null)[] | undefined, b: (number | null)[] | undefined) =>
  a === b || (!!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]));

/** The channels of the fixture's mode, in the same order as its DMX values. [] if the mode or a channel is missing. */
const getChannelsForFixture = (fixture: PatchedFixture, fixtureTemplate: FixtureTemplate): Channel[] => {
  const mode = fixtureTemplate.modes.find((m) => m.id === fixture.modeId);
  if (!mode) return [];

  const channelsById = new Map(fixtureTemplate.channels.map((c) => [c.id, c]));
  const channels = mode.channelIds.map((channelId) => channelsById.get(channelId));

  if (channels.some((c) => c === undefined)) {
    console.error(
      `Some channels are undefined for fixture ${fixture.id}. Check fixture template and mode configuration.`,
      fixtureTemplate,
      fixture,
    );
    return [];
  }
  return channels as Channel[];
};
