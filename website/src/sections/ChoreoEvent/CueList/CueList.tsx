// feature[class=Realtime] Scrollable cue list with cursor tracking surface

import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActionIcon, Alert, Box, Button, Center, Flex, Group, Loader, Stack, Title, Tooltip } from "@mantine/core";
import { IconInfoCircle, IconZoomIn, IconZoomOut } from "@tabler/icons-react";
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

    // Skip the leading viewport-height spacer once the selected band's cues are ready.
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

      const container = cueListScrollRef.current;

      cueListScrollRef.current.scrollTo({ top: container.clientHeight, behavior: "instant" });
      didInitialScroll.current = true;
    }, [isCueListReady, itemId]);

    // AI impl: not working, todo: https://github.com/HollaG/lighting-cue-maker/issues/11
    // useEffect(() => {
    //   const container = cueListScrollRef.current;
    //   if (!container) return;

    //   /** Limit wheel movement into the spacers without restricting cue-triggered scrollTo calls. */
    //   const handleWheel = (event: WheelEvent) => {
    //     if (event.defaultPrevented || event.ctrlKey || event.deltaY === 0) return;

    //     // Let nested controls, such as textareas, consume their own scrolling first.
    //     let target = event.target instanceof HTMLElement ? event.target : null;
    //     while (target && target !== container) {
    //       const overflowY = getComputedStyle(target).overflowY;
    //       const canScroll = event.deltaY < 0
    //         ? target.scrollTop > 0
    //         : target.scrollTop + target.clientHeight < target.scrollHeight;
    //       if (/(auto|scroll)/.test(overflowY) && canScroll) return;
    //       target = target.parentElement;
    //     }

    //     const height = container.clientHeight;
    //     const contentEndScroll = container.scrollHeight - height * 2;
    //     // For a short list, allow movement between bottom and top alignment.
    //     const minScroll = Math.min(height, contentEndScroll);
    //     const maxScroll = Math.max(height, contentEndScroll);
    //     const current = container.scrollTop;
    //     const unit = event.deltaMode === WheelEvent.DOM_DELTA_PAGE
    //       ? height
    //       : event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1;
    //     const delta = event.deltaY * unit;
    //     const next = current + delta;

    //     // When cue alignment puts us outside the bounds, permit movement back
    //     // toward the cards without snapping immediately to the nearest boundary.
    //     const limited = delta < 0
    //       ? Math.max(next, Math.min(current, minScroll))
    //       : Math.min(next, Math.max(current, maxScroll));

    //     if (limited !== next && event.cancelable) {
    //       event.preventDefault();
    //       container.scrollTo({ top: limited, behavior: "instant" });
    //     }
    //   };

    //   // React's wheel listener is passive; a native listener allows preventDefault.
    //   container.addEventListener("wheel", handleWheel, { passive: false });
    //   return () => container.removeEventListener("wheel", handleWheel);
    // }, [cues?.length]);

    return (
      <Stack h="100%" style={{ minHeight: 0 }}>
        <Group style={{ flexShrink: 0 }}>
          <Title order={3}>Cues</Title>
          {isCuesLoading && <Loader type="bars" size="xs" />}
          <Flex flex={1} />
          <ViewModeSelect viewMode={globalViewMode} setViewMode={setGlobalViewMode} />

          {/* <Text>Adjust width</Text> */}
          <Tooltip label={canDecreaseWidth ? "Decrease width of the Cue List" : "Minimum width reached"}>
            <ActionIcon size="lg" color="gray" variant="light" onClick={onDecreaseWidth} disabled={!canDecreaseWidth}>
              {/* <IconChevronRight style={{ width: "1rem" }} /> */}
              <IconZoomOut size="1rem" />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={canIncreaseWidth ? "Increase width of the Cue List" : "Maximum width reached"}>
            <ActionIcon size="lg" color="gray" variant="light" onClick={onIncreaseWidth} disabled={!canIncreaseWidth}>
              {/* <IconChevronLeft style={{ width: "1rem" }} /> */}
              <IconZoomIn size="1rem" />
            </ActionIcon>
          </Tooltip>
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
                  transition: { holdTimeMs: 0, transitionTimeMs: 0 },
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
                  transition: { holdTimeMs: 0, transitionTimeMs: 0 },
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
                  transition: { holdTimeMs: 0, transitionTimeMs: 0 },
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
            data-cursor-surface="cueCard"
            data-cursor-item-id={itemId}
            style={{
              transition: "all 0.3s ease-in-out",
              transform: `translateY(${calculatedOffset}px)`,
              zIndex: 10,
              position: "relative",
            }}
            gap={0}
          >
            {/* Hack to allow for scrolling "up" or "down" ""past"" the normal limits */}
            {/* Not sure what this does? Try removing it, add some lyrics and set ONE cue where the marker is far down the page. */}
            {/* You'll notice that the one cue doesn't move, cos it can't scroll anywhere. */}
            <Box style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* <Card mb="md" style={{ height: "stretch", backgroundColor: "transparent" }}></Card> */}
              <Button
                variant="subtle"
                onClick={() => {
                  // set scroll position to the height of this box (100% height)
                  if (cueListScrollRef.current) {
                    cueListScrollRef.current.scrollTo({
                      top: cueListScrollRef.current.clientHeight,
                      behavior: "smooth",
                    });
                  }
                }}
              >
                {" "}
                Reset view
              </Button>
            </Box>

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
            <Box style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Button
                variant="subtle"
                onClick={() => {
                  // set scroll position to the bottom of this box (100% height)
                  if (cueListScrollRef.current) {
                    cueListScrollRef.current.scrollTo({
                      top: cueListScrollRef.current.scrollHeight - cueListScrollRef.current.clientHeight * 2,

                      behavior: "smooth",
                    });
                  }
                }}
              >
                {" "}
                Reset view
              </Button>
            </Box>
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
