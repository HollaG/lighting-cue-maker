import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActionIcon, Alert, Box, Center, Flex, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconInfoCircle } from "@tabler/icons-react";
import { CueCard } from "../../../components/Cues/CueCard/CueCard";
import { useGetCues } from "../../../query/useGetCues";
import { useAppStore } from "../../../store/appStore";
import type { LightEventConfiguration } from "../../../types/types";
import { useGetOrCreateVisualiser } from "../../../query/useGetOrCreateVisualiser";
import { useGetFixturesByEventId } from "../../../query/useGetFixtures";
import { CustomCoverLoader } from "../../../components/Loader/CustomCoverLoader";
import { ViewModeSelect, type ViewMode } from "../../../components/Cues/CueCard/ViewModeSelect";
import classes from "./CueList.module.css";
import { getCueOrder } from "../../../utils/cue/cueForm";

type CueListProps = {
  itemId: string;
  rawLyrics: string;
  event: LightEventConfiguration;
  showCueList: boolean;
  isPendingRendering: boolean;
  canIncreaseWidth: boolean;
  canDecreaseWidth: boolean;
  onIncreaseWidth: () => void;
  onDecreaseWidth: () => void;
};

export const CueList = memo(
  ({
    itemId,
    rawLyrics,
    event,
    showCueList,
    isPendingRendering,
    canIncreaseWidth,
    canDecreaseWidth,
    onIncreaseWidth,
    onDecreaseWidth,
  }: CueListProps) => {
    const { cues, isCuesLoading } = useGetCues({ itemId });

    // The store's derived order updates later in EventPage's effect on band changes.
    // Instead of using the store's order, which causes some issues with the scroll position
    // as first the itemId changes THEN the store changes
    const cueOrder = useMemo(() => getCueOrder(rawLyrics), [rawLyrics]);
    const currentlySelectedCueId = useAppStore((s) => s.currentlySelectedCueId);

    const [offset, setOffset] = useState(0);
    const calculatedOffset = currentlySelectedCueId ? offset : 0;

    // Handle visualisers
    const { visualiser } = useGetOrCreateVisualiser({ eventId: event.id });
    const { fixtures } = useGetFixturesByEventId({ event: event || undefined });

    // handle swap between table and 2D view
    const [globalViewMode, setGlobalViewMode] = useState<ViewMode>("Table");

    // Skip the 5000px spacer once the selected band's cues are ready.
    const cueListScrollRef = useRef<HTMLDivElement>(null);
    const didInitialScroll = useRef(false);
    const scrollItemId = useRef(itemId);
    const isCueListReady = Boolean(showCueList && itemId && cues?.length);

    useLayoutEffect(() => {
      if (scrollItemId.current !== itemId) {
        scrollItemId.current = itemId;
        didInitialScroll.current = false;
      }

      if (!isCueListReady || !cueListScrollRef.current || didInitialScroll.current) {
        return;
      }

      cueListScrollRef.current.scrollTo({ top: 5000, behavior: "instant" });
      didInitialScroll.current = true;
    }, [isCueListReady, itemId]);

    return (
      <Stack h="100%" style={{ minHeight: 0 }}>
        <Group style={{ flexShrink: 0 }}>
          <Title order={3}>Cues</Title>
          {isCuesLoading && <Loader type="bars" size="xs" />}
          <Flex flex={1} />
          <ViewModeSelect viewMode={globalViewMode} setViewMode={setGlobalViewMode} />

          <ActionIcon size="lg" color="gray" variant="light" onClick={onIncreaseWidth} disabled={!canIncreaseWidth}>
            <IconChevronLeft style={{ width: "1rem" }} />
          </ActionIcon>
          <Text>Adjust width</Text>
          <ActionIcon size="lg" color="gray" variant="light" onClick={onDecreaseWidth} disabled={!canDecreaseWidth}>
            <IconChevronRight style={{ width: "1rem" }} />
          </ActionIcon>
        </Group>
        {isCuesLoading && (
          <Stack className={classes.cards}>
            <CustomCoverLoader isLoading>
              <CueCard
                key="loading"
                cue={{
                  assignments: {},
                  cueConfig: { mode: "unknown" },
                  id: "loading",
                  comments: "",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  deletedAt: new Date(),
                }}
                cueNumber={0}
                isCueSelected={false}
                fixtureGroups={event.fixtureGroups}
                setOffset={() => {}}
                visualiser={visualiser}
                fixtures={fixtures}
                eventId={event.id}
                globalViewMode={globalViewMode}
              />
            </CustomCoverLoader>
            <CustomCoverLoader isLoading>
              <CueCard
                key="loading"
                cue={{
                  assignments: {},
                  cueConfig: { mode: "unknown" },
                  id: "loading",
                  comments: "",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  deletedAt: new Date(),
                }}
                cueNumber={0}
                isCueSelected={false}
                fixtureGroups={event.fixtureGroups}
                setOffset={() => {}}
                visualiser={visualiser}
                fixtures={fixtures}
                eventId={event.id}
                globalViewMode={globalViewMode}
              />
            </CustomCoverLoader>
            <CustomCoverLoader isLoading>
              <CueCard
                key="loading"
                cue={{
                  assignments: {},
                  cueConfig: { mode: "unknown" },
                  id: "loading",
                  comments: "",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  deletedAt: new Date(),
                }}
                cueNumber={0}
                isCueSelected={false}
                fixtureGroups={event.fixtureGroups}
                setOffset={() => {}}
                visualiser={visualiser}
                fixtures={fixtures}
                eventId={event.id}
                globalViewMode={globalViewMode}
              />
            </CustomCoverLoader>
          </Stack>
        )}
        {showCueList && itemId && <></>}
        {cues && cues.length > 0 ? (
          <Stack
            ref={cueListScrollRef}
            className={classes.cards}
            style={{
              transition: "all 0.3s ease-in-out",
              transform: `translateY(${calculatedOffset}px)`,
              zIndex: 10,
            }}

            gap={0}
          >
            {/* Hack to allow for scrolling "up" or "down" ""past"" the normal limits */}
            {/* Not sure what this does? Try removing it, add some lyrics and set ONE cue where the marker is far down the page. */}
            {/* You'll notice that the one cue doesn't move, cos it can't scroll anywhere. */}
            <Box style={{ height: "5000px" }}> </Box>

            {cueOrder.map((cueId, index) => {
              const cue = cues.find((c) => c.id === cueId);
              if (!cue) return null;
              return (
                <Box key={cue.id} mb="md">
                  <CueCard
                    cue={cue}
                    cueNumber={index + 1}
                    isCueSelected={currentlySelectedCueId === cue.id}
                    fixtureGroups={event.fixtureGroups}
                    setOffset={setOffset}
                    visualiser={visualiser}
                    fixtures={fixtures}
                    eventId={event.id}
                    globalViewMode={globalViewMode}
                  />
                </Box>
              );
            })}

            {/* Hack to allow for scrolling "up" or "down" ""past"" the normal limits */}
            <Box style={{ height: "5000px" }}> </Box>
          </Stack>
        ) : (
          <Center>
            <Alert icon={<IconInfoCircle />} variant="transparent" color="white">
              No cues yet, add them to lyrics on the left panel.
            </Alert>
          </Center>
        )}
        {isPendingRendering && (
          <Center>
            <Loader />
          </Center>
        )}
      </Stack>
    );
  },
);
