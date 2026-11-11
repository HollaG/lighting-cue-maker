import { ActionIcon, Box, Button, Divider, Group, OverflowList, Scroller, Stack, Text } from "@mantine/core";
import type { useResolvedDmx } from "../../hooks/useResolvedDmx";
import { useCallback, useEffect, useState } from "react";
import { useGetPatchedFixtures } from "../../query-v2/patched-fixtures/useGetPatchedFixtures";
import { useAppStore } from "../../store/appStore";
import { CardBase } from "../Cues/CardBase";
import { useGetEvent } from "../../query-v2/events/useGetEvent";
import { Logger } from "../../utils/logger";
import { DMXControl } from "./DMXControl/DMXControl";
import { useGetCue } from "../../query-v2/cues/useGetCue";
import { useUpsertCue } from "../../query-v2/cues/useUpsertCue";
import { IconChevronDown } from "@tabler/icons-react";

const logger = new Logger("DMXControlWrapper", "red");

export const DMXControlWrapper = ({
  eventId,
  itemId,
  dmxValuesByFixtureId,
}: {
  eventId: string;
  itemId: string;
  dmxValuesByFixtureId: NonNullable<ReturnType<typeof useResolvedDmx>["dmxValues"]>;
}) => {
  const currentlyViewingFixtureIds = useAppStore((s) => s.currentlyViewingFixtureIds);
  const setCurrentlyViewingFixtureIds = useAppStore((s) => s.setCurrentlyViewingFixtureIds);
  const setIsDmxDrawerOpen = useAppStore((s) => s.setIsDmxDrawerOpen);

  const cueId = useAppStore((s) => s.currentlySelectedCueId);
  const { cue } = useGetCue(eventId, itemId, cueId);
  const { mutateAsync: upsertCue } = useUpsertCue(eventId, itemId);

  const { patchedFixtures, isPatchedFixturesLoading } = useGetPatchedFixtures(eventId);
  const { event } = useGetEvent(eventId);
  const fixtureTemplates = event?.fixtureTemplates ?? [];
  const overrides = cue?.overrides || {};

  /**
   * Get the channels for this fixture and its selected mode.
   *
   * @param fixtureId
   * @returns
   */
  const getChannelsForFixture = (fixtureId: string) => {
    const fixtureTemplate = fixtureTemplates.find(
      (ft) => ft.id === patchedFixtures.find((pf) => pf.id === fixtureId)?.fixtureTemplateId,
    );
    if (!fixtureTemplate) {
      return [];
    }

    const mode = fixtureTemplate.modes.find((m) => m.id === patchedFixtures.find((pf) => pf.id === fixtureId)?.modeId);

    if (!mode) {
      return [];
    }

    const channels = mode.channelIds.map((channelId) => fixtureTemplate.channels.find((c) => c.id === channelId));

    // if any channel is undefined, log error
    if (channels.some((c) => c === undefined)) {
      console.error(
        `Some channels are undefined for fixture ${fixtureId}. Check fixture template and mode configuration.`,
      );
      console.error(
        fixtureTemplate,
        patchedFixtures.find((pf) => pf.id === fixtureId),
      );
      return [];
    }

    // the channels are now in the same order as the dmx values.

    return channels as NonNullable<(typeof channels)[number]>[];
  };

  const onCommit = useCallback(
    (fixtureId: string, channelId: string, value: number) => {
      if (!cue) return;
      upsertCue({
        id: cue.id,
        overrides: { ...cue.overrides, [fixtureId]: { ...cue.overrides[fixtureId], [channelId]: value } },
      });
    },
    [cue, upsertCue],
  );

  const onClear = useCallback(
    (fixtureId: string, channelId: string) => {
      if (!cue) return;
      const { [channelId]: _, ...rest } = cue.overrides[fixtureId] ?? {};
      const overrides = { ...cue.overrides };
      if (Object.keys(rest).length) overrides[fixtureId] = rest;
      else delete overrides[fixtureId]; // no empty {} left behind
      upsertCue({ id: cue.id, overrides });
    },
    [cue, upsertCue],
  );
  return (
    <Stack gap="xs" style={{ height: "100%", overflow: "hidden" }}>
      <Group style={{ width: "100%", flex: "0 0 auto" }} align="flex-start">
        <Scroller flex={1}>
          <Group gap={"xs"} style={{ flexWrap: "nowrap" }} ml="xs">
            {patchedFixtures.map((fixture) => (
              <Button
                size="xs"
                key={fixture.id}
                color={currentlyViewingFixtureIds.includes(fixture.id) ? "lime" : "gray"}
                variant={currentlyViewingFixtureIds.includes(fixture.id) ? "light" : "outline"}
                // Toggle: remove if already viewing, otherwise add (no duplicates).
                onClick={() =>
                  setCurrentlyViewingFixtureIds(
                    currentlyViewingFixtureIds.includes(fixture.id)
                      ? currentlyViewingFixtureIds.filter((id) => id !== fixture.id)
                      : [...currentlyViewingFixtureIds, fixture.id],
                  )
                }
              >
                {fixture.name}
              </Button>
            ))}
          </Group>
        </Scroller>
        <ActionIcon mr="xs" variant="transparent" onClick={() => setIsDmxDrawerOpen(false)}>
          <IconChevronDown size="1rem" />
        </ActionIcon>
      </Group>

      <Box
        style={{
          overflowX: "auto",
          display: "flex",
          flexDirection: "row",
          flexWrap: "nowrap",
          overflowY: "hidden",

          flex: 1, // take the height left in the 25vh Stack, not the cards' content height
          minHeight: 0,
          gap: "var(--mantine-spacing-xs)",

          paddingLeft: "var(--mantine-spacing-xs)",
          paddingBottom: "var(--mantine-spacing-xs)",
        }}
      >
        {patchedFixtures.map((fixture) => (
          <Box
            // ref={(el) => {
            //   if (el && currentlyViewingFixtureIds.includes(fixture.id)) {
            //     el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
            //   }
            // }}
            key={fixture.id}

            style={{ display: "flex", flex: "0 0 auto", minHeight: 0 }}
          >
            <CardBase
              isActive={currentlyViewingFixtureIds.includes(fixture.id)}
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
                  fontSize: "0.6rem",
                  marginTop: "auto",
                }}
              >
                {fixture.name}
              </Text>

              {getChannelsForFixture(fixture.id).map((channel, index) => (
                <DMXControl
                  key={channel.id}
                  channel={channel}
                  dmxValue={dmxValuesByFixtureId[fixture.id]?.[index]}
                  onClear={() => onClear(fixture.id, channel.id)}
                  onCommit={(channelId, value) => onCommit(fixture.id, channelId, value)}
                  overrideValue={overrides[fixture.id]?.[channel.id]}
                />
              ))}
            </CardBase>
          </Box>
        ))}
      </Box>
    </Stack>
  );
};
