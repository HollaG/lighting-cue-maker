import { ActionIcon, Box, Button, /* Divider, */ Group, /* OverflowList, */ Scroller, Stack } from "@mantine/core";
import type { useResolvedDmx } from "../../hooks/useResolvedDmx";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useGetPatchedFixtures } from "../../query-v2/patched-fixtures/useGetPatchedFixtures";
import { useAppStore } from "../../store/appStore";
import { useGetEvent } from "../../query-v2/events/useGetEvent";
// import { Logger } from "../../utils/logger";
import { DMXFixture } from "./DMXFixture";
import { useGetCue } from "../../query-v2/cues/useGetCue";
import { useUpsertCue } from "../../query-v2/cues/useUpsertCue";
import { IconChevronDown } from "@tabler/icons-react";
import type { PatchedFixture } from "../../types-v2/patchedFixture";

// const logger = new Logger("DMXControlWrapper", "red");

export const DMXControlWrapper = ({
  eventId,
  itemId,
  dmxValuesByFixtureId,
}: {
  eventId: string;
  itemId: string;
  dmxValuesByFixtureId: NonNullable<ReturnType<typeof useResolvedDmx>["dmxValues"]>;
}) => {
  const currentlyViewingFixtureIds = useAppStore((s) => s.selectedFixtureIds);
  const setCurrentlyViewingFixtureIds = useAppStore((s) => s.setSelectedFixtureIds);
  const setIsDmxDrawerOpen = useAppStore((s) => s.setIsDmxDrawerOpen);

  /** Each fixture's slider card, by fixture id, so a newly selected fixture can be scrolled into view. */
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  const cueId = useAppStore((s) => s.currentlySelectedCueId);
  const { cue } = useGetCue(eventId, itemId, cueId);
  const { mutateAsync: upsertCue } = useUpsertCue(eventId, itemId);

  const { patchedFixtures /* , isPatchedFixturesLoading */ } = useGetPatchedFixtures(eventId);

  const displayedFixtures = useMemo(
    () =>
      currentlyViewingFixtureIds.length === 0
        ? patchedFixtures.map((f) => ({ fixture: f, show: true }))
        : patchedFixtures.map((f) => ({ fixture: f, show: currentlyViewingFixtureIds.includes(f.id) })),
    [patchedFixtures, currentlyViewingFixtureIds],
  );
  const { event } = useGetEvent(eventId);
  const fixtureTemplates = event?.fixtureTemplates ?? [];
  const overrides = cue?.overrides || {};

  const templatesById = useMemo(() => new Map(fixtureTemplates.map((t) => [t.id, t])), [fixtureTemplates]);

  // The latest cue, for the callbacks below. Read through a ref so the callbacks stay the same function across cue
  // changes; otherwise every memoized DMXFixture would re-render on each change.
  const cueRef = useRef(cue);
  useLayoutEffect(() => {
    cueRef.current = cue;
  });

  /**
   * Several channels of one fixture in a single save. Calling onCommit once per channel instead would lose all but
   * the last: each call reads cueRef before the previous change has re-rendered into it.
   */
  const onCommitMany = useCallback(
    (fixtureId: string, valuesByChannelId: Record<string, number>) => {
      const cue = cueRef.current;
      if (!cue) return;
      upsertCue({
        id: cue.id,
        overrides: { ...cue.overrides, [fixtureId]: { ...cue.overrides[fixtureId], ...valuesByChannelId } },
      });
    },
    [upsertCue],
  );

  const onCommit = useCallback(
    (fixtureId: string, channelId: string, value: number) => onCommitMany(fixtureId, { [channelId]: value }),
    [onCommitMany],
  );

  const onClear = useCallback(
    (fixtureId: string, channelId: string) => {
      const cue = cueRef.current;
      if (!cue) return;
      const { [channelId]: _, ...rest } = cue.overrides[fixtureId] ?? {};
      const overrides = { ...cue.overrides };
      if (Object.keys(rest).length) overrides[fixtureId] = rest;
      else delete overrides[fixtureId]; // no empty {} left behind
      upsertCue({ id: cue.id, overrides });
    },
    [upsertCue],
  );

  const registerCard = useCallback((fixtureId: string, el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(fixtureId, el);
    else cardRefs.current.delete(fixtureId);
  }, []);

  const onFixtureButtonClick = useCallback(
    (fixture: PatchedFixture) => {
      if (currentlyViewingFixtureIds.includes(fixture.id)) {
        setCurrentlyViewingFixtureIds(currentlyViewingFixtureIds.filter((id) => id !== fixture.id));
        return;
      }
      setCurrentlyViewingFixtureIds([...currentlyViewingFixtureIds, fixture.id]);
      // Only on select, not deselect.
      // cardRefs.current.get(fixture.id)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    },
    [currentlyViewingFixtureIds, setCurrentlyViewingFixtureIds],
  );

  // store the "previous" state of the selected fixture ids
  const prevSelectedFixtureIdsRef = useRef<string[]>(currentlyViewingFixtureIds);
  useEffect(() => {
    // when the fixture ids change, get only the ADDITIONS
    // do not get deletions
    const additions = currentlyViewingFixtureIds.filter((id) => !prevSelectedFixtureIdsRef.current.includes(id));
    if (additions.length) {
      // scroll the first addition into view
      const firstAddedFixtureId = additions[0];
      cardRefs.current
        .get(firstAddedFixtureId)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
    prevSelectedFixtureIdsRef.current = currentlyViewingFixtureIds;
  }, [currentlyViewingFixtureIds]);

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
                onClick={() => onFixtureButtonClick(fixture)}
              >
                {fixture.name}
              </Button>
            ))}
          </Group>
        </Scroller>
        <Button size="xs" variant="subtle" onClick={() => setCurrentlyViewingFixtureIds([])}>
          Deselect
        </Button>
        <ActionIcon mr="xs" variant="transparent" onClick={() => setIsDmxDrawerOpen(false)}>
          <IconChevronDown size="1rem" />
        </ActionIcon>
      </Group>

      <Box
        style={{
          overflowX: "scroll",
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
        {/* {displayedFixtures.map((fixture) => (
          <DMXFixture
            key={fixture.id}
            fixture={fixture}
            fixtureTemplate={templatesById.get(fixture.fixtureTemplateId)}
            dmxValues={dmxValuesByFixtureId[fixture.id]}
            overrides={overrides[fixture.id]}
            isActive={currentlyViewingFixtureIds.includes(fixture.id)}
            onCommit={onCommit}
            onCommitMany={onCommitMany}
            onClear={onClear}
            registerCard={registerCard}
          />
        ))} */}
        {displayedFixtures.map(({ fixture, show }) => (
          <Box
            key={fixture.id}

            style={{
              display: show ? "flex" : "none",
              flex: "0 0 auto",
              minHeight: 0,
            }}
          >
            <DMXFixture
              fixture={fixture}
              fixtureTemplate={templatesById.get(fixture.fixtureTemplateId)}
              dmxValues={dmxValuesByFixtureId[fixture.id]}
              overrides={overrides[fixture.id]}
              isActive={currentlyViewingFixtureIds.includes(fixture.id)}
              onCommit={onCommit}
              onCommitMany={onCommitMany}
              onClear={onClear}
              registerCard={registerCard}
            />
          </Box>
        ))}
      </Box>
    </Stack>
  );
};
