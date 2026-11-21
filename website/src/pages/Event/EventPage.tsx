import {
  Anchor,
  Box,
  Button,
  Center,
  Container,
  Divider,
  Drawer,
  Flex,
  FloatingIndicator,
  getDefaultZIndex,
  Group,
  Image,
  Loader,
  Menu,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useLocalStorage, useWindowEvent } from "@mantine/hooks";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useGetEvent } from "../../query-v2/events/useGetEvent";
import { useGetItems } from "../../query-v2/items/useGetItems";
import { useUpsertItem } from "../../query-v2/items/useUpsertItem";
import { useGetPatchedFixtures } from "../../query-v2/patched-fixtures/useGetPatchedFixtures";
import { useGetVisualiser } from "../../query-v2/visualiser/useGetVisualiser";
// import { StaticVisualiser3D } from "../../components/Visualiser3D-v2/Visualiser3D";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../../store/appStore";
// import { Logger } from "../../utils/logger";
import { saveRecentEvent } from "../../utils/recentEvents";
import QlcLogo from "../../assets/qlc_logo.svg";
import classes from "./EventPage.module.css";
import {
  IconArrowLeft,
  IconLayoutSidebarRightCollapse,
  IconLayoutSidebarRight,
  IconEyeClosed,
  IconEye,
  IconPlayerPlay,
  IconFileExport,
  IconFileSpreadsheet,
  IconEdit,
  IconHelpCircle,
} from "@tabler/icons-react";
import { Lyrics } from "../../components/Event/Lyrics";
import { Cues } from "../../components/Event/Cues";
import { popTransition } from "../../utils/animations";
import { VisualiserInputProcessor } from "../../components/Visualiser3D-v2/Processing/VisualiserInputProcessor";
import { ResolutionScaleSelect } from "../../components/Visualiser3D-v2/ResolutionScaleSelect";
import { useResolvedDmx } from "../../hooks/useResolvedDmx";
import { useLiveQueryUpdates } from "../../hooks/realtime/useLiveQueryUpdates";
import { DMXControlWrapper } from "../../components/DMX/DMXControlWrapper";
import { RichContentWrapper } from "../../components/RichContent-v2/RichContentWrapper";
import { TimelineDrawerContainer } from "../../components/Timeline/TimelineDrawerContainer";
import { DrawerResizeHandle } from "../../components/DrawerResizeHandle/DrawerResizeHandle";
import { resizableDrawerStyles, useDrawerSize } from "../../components/DrawerResizeHandle/useDrawerSize";
import { CustomTextInput } from "../../components/CustomTextInput/CustomTextInput";
import { DebouncedTextInput } from "../../components/Inputs/DebouncedTextInput";
import { DebouncedTextarea } from "../../components/Inputs/DebouncedTextarea";
import { ConfirmDeleteButton } from "../../components/ConfirmDeleteButton/ConfirmDeleteButton";
import { useDeleteItem } from "../../query-v2/items/useDeleteItem";
import { EventTour } from "../../components/Tour/Event/EventTour";
import { HelpContent } from "../../components/Tour/Help";

// const logger = new Logger("EventPage.tsx");

export const EventPage = () => {
  const { eventId } = useParams({
    from: "/events/$eventId/",
  });
  // Drawer open/close state lives in the store (eventSlice), so other components and the tour can open them.
  const openedEventDetails = useAppStore((s) => s.isEventDetailsDrawerOpen);
  const setIsEventDetailsDrawerOpen = useAppStore((s) => s.setIsEventDetailsDrawerOpen);
  const toggleEventDetails = useAppStore((s) => s.toggleEventDetailsDrawer);
  const openEventDetails = useCallback(() => setIsEventDetailsDrawerOpen(true), [setIsEventDetailsDrawerOpen]);
  const closeEventDetails = useCallback(() => setIsEventDetailsDrawerOpen(false), [setIsEventDetailsDrawerOpen]);

  const openedLyrics = useAppStore((s) => s.isLyricsDrawerOpen);
  const setIsLyricsDrawerOpen = useAppStore((s) => s.setIsLyricsDrawerOpen);
  const toggleLyrics = useAppStore((s) => s.toggleLyricsDrawer);
  const closeLyrics = useCallback(() => setIsLyricsDrawerOpen(false), [setIsLyricsDrawerOpen]);

  const openedCues = useAppStore((s) => s.isCuesDrawerOpen);
  const setIsCuesDrawerOpen = useAppStore((s) => s.setIsCuesDrawerOpen);
  const toggleCues = useAppStore((s) => s.toggleCuesDrawer);
  const closeCues = useCallback(() => setIsCuesDrawerOpen(false), [setIsCuesDrawerOpen]);

  const isDmxDrawerOpen = useAppStore((s) => s.isDmxDrawerOpen);
  const setIsDmxDrawerOpen = useAppStore((s) => s.setIsDmxDrawerOpen);
  const toggleDmx = useAppStore((s) => s.toggleDmxDrawer);

  const openedTimeline = useAppStore((s) => s.isTimelineDrawerOpen);
  const setIsTimelineDrawerOpen = useAppStore((s) => s.setIsTimelineDrawerOpen);
  const toggleTimeline = useAppStore((s) => s.toggleTimelineDrawer);
  const closeTimeline = useCallback(() => setIsTimelineDrawerOpen(false), [setIsTimelineDrawerOpen]);

  const isHelpDialogOpen = useAppStore((s) => s.isHelpDialogOpen);
  const setIsHelpDialogOpen = useAppStore((s) => s.setIsHelpDialogOpen);
  const closeHelpDialog = useCallback(() => setIsHelpDialogOpen(false), [setIsHelpDialogOpen]);

  const selectedFixtureIds = useAppStore((s) => s.selectedFixtureIds);
  const setSelectedFixtureIds = useAppStore((s) => s.setSelectedFixtureIds);

  // The timeline drawer's own Escape (closeOnEscape) is off: Mantine's modals and drawers each listen for Escape on
  // window (capture phase), so Escape inside a modal opened from the timeline (e.g. placing a cue marker) closed both.
  // Bubble phase runs after the modal's handler, and the modal is still in the DOM then (React hasn't re-rendered).
  useWindowEvent("keydown", (event) => {
    if (event.key !== "Escape" || event.isComposing || !openedTimeline) return;
    if (document.querySelector(".mantine-Modal-content")) return; // a modal is open: Escape is for it
    closeTimeline();
  });

  // Drawer sizes (viewport %, saved in local storage): every drawer but event details can be resized.
  const HEIGHT_LIMITS = { min: 20, max: 85 }; // bottom drawers, vh
  const WIDTH_LIMITS = { min: 20, max: 80 }; // side drawers, vw
  const [timelineHeight, resizeTimeline] = useDrawerSize("timeline-drawer-height", 30, HEIGHT_LIMITS);
  const [dmxHeight, resizeDmx] = useDrawerSize("dmx-drawer-height", 30, HEIGHT_LIMITS);
  const [lyricsWidth, resizeLyrics] = useDrawerSize("lyrics-drawer-width", 35, WIDTH_LIMITS);
  const [cuesWidth, resizeCues] = useDrawerSize("cues-drawer-width", 35, WIDTH_LIMITS);

  const toggleDrawerHandler = (toggleCb: () => void, domain: "event" | "lyrics" | "cues" | "timeline" | "dmx") => {
    // only one drawer can be open at a time, so close the others if its open
    if (domain === "event") {
      closeLyrics();
      closeCues();
    } else if (domain === "lyrics") {
      closeEventDetails();
    } else if (domain === "cues") {
      closeEventDetails();
    } else if (domain === "timeline") {
      // timeline and DMX share the bottom edge: only one of them at a time (either can sit with any other drawer)
      setIsDmxDrawerOpen(false);
    } else if (domain === "dmx") {
      closeTimeline();
    }
    toggleCb();
  };

  // CueCards open the DMX drawer through the store, without going through toggleDrawerHandler: close the timeline then too.
  useEffect(() => {
    if (isDmxDrawerOpen) closeTimeline();
  }, [isDmxDrawerOpen, closeTimeline]);

  // hooks to get data
  const { event: evt, isEventLoading } = useGetEvent(eventId); // NOTE: evt is nullable, remember to check
  const { items, isItemsLoading } = useGetItems(eventId);
  const { visualiser, isVisualiserLoading } = useGetVisualiser(eventId);
  const { patchedFixtures } = useGetPatchedFixtures(eventId);
  // Static values (with overrides) go to the DMX drawer and the visualiser. Pattern effects come compiled
  // (effectPlayback) and play inside the visualiser's canvas, so this page doesn't re-render per effect step.
  const { dmxValuesWithOverrides, effectPlayback, cueFade, isLoading } = useResolvedDmx(eventId, patchedFixtures);

  // Live updates: when someone else in the event saves, the v2 mutation hooks broadcast the query keys they changed
  // (through the realtime server); this refetches them here.
  useLiveQueryUpdates(); // only call ONCE

  // Remember this event for "Past events" on the home page. Waits for the name, so the list never shows a blank entry;
  // a rename updates the stored name the next time the event loads.
  const eventName = evt?.name;
  useEffect(() => {
    if (!eventName) return;
    saveRecentEvent({ eventId, eventName });
  }, [eventId, eventName]);

  const [selectedItemId, setSelectedItemId] = useLocalStorage({
    key: `${eventId}-item-selected`,
    defaultValue: "",
    getInitialValueInEffect: false, // read storage on the first render, not in an effect
  });

  useEffect(() => {
    if (!selectedItemId) openEventDetails();
  }, [eventId]);

  const setTourActive = useAppStore((s) => s.setEventTourActive);

  // --- New user ---------
  // First visit to any event in this browser (not per event). Read during render (not in an effect) so the first
  // render already has it; the effect below then marks the browser as visited for next time.
  const isUserNew = useMemo(() => !localStorage.getItem("event-page-visited"), []);
  useEffect(() => {
    localStorage.setItem("event-page-visited", "1");
  }, []);

  // --- Last seen ---------
  // When the user last hid/left this event, and which item they were on, so a later visit can show what changed
  // since then. Saved as JSON: { time: number (ms since epoch), itemId: string }.
  // The item is read through a ref: the listeners are set up once per event, and would otherwise save a stale item.
  const selectedItemIdRef = useRef(selectedItemId);
  selectedItemIdRef.current = selectedItemId;
  useEffect(() => {
    const key = `${eventId}-last-seen`;
    const save = () =>
      localStorage.setItem(key, JSON.stringify({ time: Date.now(), itemId: selectedItemIdRef.current }));

    const onVisibility = () => {
      if (document.visibilityState === "hidden") save(); // tab hidden, minimised, or closed
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      save(); // leaving the event page inside the app (route change / switching event)
    };
  }, [eventId]);

  // Mirror the selected item into the app store (`activeItemId`), for components that aren't handed it as a prop.
  // The page's per-event local storage above stays the source of truth, so each event still remembers its own item.
  // `changeActiveItem` also clears the selected cue when the item changes, so a cue from the previous item isn't kept.
  const changeActiveItem = useAppStore((s) => s.changeActiveItem);
  useEffect(() => changeActiveItem(selectedItemId || null), [selectedItemId, changeActiveItem]);

  const navigate = useNavigate();
  const onEdit = () => navigate({ to: "/events/$eventId/edit", params: { eventId } });
  const onGoRunMode = () => navigate({ to: "/events/$eventId/run", params: { eventId } });

  // View options live in the shared app store (the same toggles the v1 page used).
  const showCues = useAppStore((s) => s.showCues);
  const toggleShowCues = useAppStore((s) => s.toggleShowCues);
  const showCueIdentifiers = useAppStore((s) => s.showCueIdentifiers);
  const toggleShowCueIdentifiers = useAppStore((s) => s.toggleShowCueIdentifiers);

  // --- Item selection ---------
  const [itemName, setItemName] = useState("");
  const { mutateAsync: upsertItem, isPending: isItemCreating } = useUpsertItem(eventId);
  // Separate from the one above, so saving the name or comments doesn't show "Add item" as loading.
  const { mutate: saveItem } = useUpsertItem(eventId);
  const { mutateAsync: deleteItem } = useDeleteItem(eventId);

  const onAddItem = async () => {
    const name = itemName.trim();
    if (!name) return;
    try {
      const res = await upsertItem({ name });
      setItemName("");
      setSelectedItemId(res.item.id); // jump to the new item
      closeEventDetails();
    } catch {
      // error notif handled by api.ts
    }
  };

  // The FloatingIndicator needs each tab's element to slide to the selected one.
  const [rootRef, setRootRef] = useState<HTMLDivElement | null>(null);
  const [controlsRefs, setControlsRefs] = useState<Record<string, HTMLButtonElement | null>>({});

  const setControlRef = useCallback(
    (id: string) => (node: HTMLButtonElement | null) => {
      setControlsRefs((previous) => (previous[id] === node ? previous : { ...previous, [id]: node }));
    },
    [],
  );

  const controls = useMemo(
    () =>
      [...items]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => (
          <UnstyledButton
            key={item.id}
            className={classes.control}
            ref={setControlRef(item.id)}
            onClick={() => {
              setSelectedItemId(item.id);
              closeEventDetails();
            }}
            mod={{ active: selectedItemId === item.id }}
            p={"xs"}
          >
            <span className={classes.controlLabel}>{item.name}</span>
          </UnstyledButton>
        )),
    [items, selectedItemId, setSelectedItemId, setControlRef, closeEventDetails],
  );

  const item = items.find((i) => i.id === selectedItemId) ?? undefined;

  // --- handle selecting of fixtures ---------
  const onFixtureSelect = (fixtureId: string, additive: boolean) => {
    if (additive) {
      // toggle the fixture in the selection
      if (selectedFixtureIds.includes(fixtureId)) {
        setSelectedFixtureIds(selectedFixtureIds.filter((id) => id !== fixtureId));
      } else {
        setSelectedFixtureIds([...selectedFixtureIds, fixtureId]);
      }
    } else {
      if (selectedFixtureIds.includes(fixtureId)) {
        // already selected, and it's the only one: deselect it
        setSelectedFixtureIds([]);
      } else {
        // select only this fixture
        setSelectedFixtureIds([fixtureId]);
      }
    }
  };

  return (
    <>
      <EventTour eventId={eventId} />

      {/* Centered pull-down */}
      <Stack
        style={{
          position: "absolute",
          top: "0.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          alignItems: "center",
        }}
        gap="xs"
      >
        <Button
          id="tour-event-0"
          size="xs"
          variant="light"
          onClick={toggleDrawerHandler.bind(null, toggleEventDetails, "event")}
        >
          {/* {openedEventDetails ? "Close" : "Open"} event details */}
          Change item
        </Button>
        {item && <Text>Item: {item.name}</Text>}
      </Stack>

      {/* DMX overrides */}
      {/* <Drawer */}
      <Drawer
        opened={isDmxDrawerOpen}
        onClose={() => setIsDmxDrawerOpen(false)}
        // keepMounted
        position="bottom"
        size={`${dmxHeight}vh`}
        // A side panel, not a modal: the visualiser next to it stays usable while the lyrics are open.
        withOverlay={false} // even a transparent overlay catches every click on the visualiser
        lockScroll={false} // scroll lock would also swallow the visualiser's scroll-to-zoom
        trapFocus={false}
        withCloseButton={false}
        closeOnEscape
        closeOnClickOutside={false} // allow manipulating the 3d visualiser

        zIndex={getDefaultZIndex("modal") + 1} // above the Lyrics and Cues drawers (both 200)
        scrollAreaComponent={undefined}

        // force the drawer body to be 100% height, never overflow; paddingTop + relative: room for the resize handle
        styles={{ body: { height: "100%", padding: 0, paddingTop: 12, position: "relative" } }}
      >
        <DrawerResizeHandle
          edge="top"
          label="DMX overrides height"
          size={dmxHeight}
          onResize={resizeDmx}
          {...HEIGHT_LIMITS}
        />
        {isLoading ? (
          <Center h="100%">
            <Loader type="bars" />
          </Center>
        ) : !dmxValuesWithOverrides ? (
          <Center h="100%">
            <Text c="dimmed" size="sm">
              Select a cue to control the fixtures
            </Text>
          </Center>
        ) : (
          <DMXControlWrapper itemId={selectedItemId} eventId={eventId} dmxValuesByFixtureId={dmxValuesWithOverrides} />
        )}
      </Drawer>

      {/* Drawer for changing items */}
      <Drawer
        opened={openedEventDetails}
        onClose={closeEventDetails}
        position="top"
        size="xl"
        overlayProps={{ backgroundOpacity: 0, blur: 1.5 }}
        withCloseButton={selectedItemId !== ""} // don't allow closing if no item is selected
        closeOnEscape={selectedItemId !== ""} // don't allow closing if no item is selected
        closeOnClickOutside={selectedItemId !== ""} // don't allow closing if no item is selected
      >
        <Container
          size={"xl"}
          style={{
            marginTop: "calc(4rem - 60px)", // 60px is the height of the header
          }}
        >
          <Group mb="2rem">
            <Button
              type="button"
              leftSection={<IconArrowLeft width="1rem" />}
              variant="transparent"
              onClick={() => navigate({ to: "/" })}
            >
              Back to home
            </Button>
            <Flex flex={1} />

            <Menu width={200} shadow={"sm"} withArrow position="bottom" transitionProps={popTransition}>
              <Menu.Target>
                <Button variant="subtle">Settings</Button>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>View options</Menu.Label>
                <Menu.Item
                  leftSection={
                    showCues ? <IconLayoutSidebarRightCollapse width="1rem" /> : <IconLayoutSidebarRight width="1rem" />
                  }
                  onClick={toggleShowCues}
                >
                  {showCues ? "Hide " : "Show "}cues panel
                </Menu.Item>
                <Menu.Item
                  leftSection={showCueIdentifiers ? <IconEyeClosed width="1rem" /> : <IconEye width="1rem" />}
                  onClick={toggleShowCueIdentifiers}
                >
                  {showCueIdentifiers ? "Hide " : "Show "}cue identifiers
                </Menu.Item>
                <Menu.Item leftSection={<IconPlayerPlay width="1rem" />} onClick={onGoRunMode}>
                  Enter RUN mode
                </Menu.Item>
                <Menu.Divider />

                <Menu.Label>Export options</Menu.Label>

                <Menu.Sub>
                  <Menu.Sub.Target>
                    <Menu.Sub.Item leftSection={<IconFileExport width="1rem" />}>Export</Menu.Sub.Item>
                  </Menu.Sub.Target>
                  <Menu.Sub.Dropdown>
                    <Menu.Item leftSection={<Image src={QlcLogo} width={16} height={16} />}>QLC+ export</Menu.Item>
                    <Menu.Item leftSection={<IconFileSpreadsheet width={"1rem"} />}>.xlsx sheet (WIP)</Menu.Item>
                  </Menu.Sub.Dropdown>
                </Menu.Sub>

                <Menu.Divider />
                <Menu.Label>Event options</Menu.Label>
                <Menu.Item leftSection={<IconEdit width="1rem" />} onClick={onEdit}>
                  Edit event
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>

          {isEventLoading ? (
            <Center>
              <Loader type="bars" />
            </Center>
          ) : (
            <Box my="xl" ml={0}>
              <Stack>
                <Group gap={0}>
                  <Title>{evt?.name}</Title>
                </Group>
                <Text> {evt?.description}</Text>
                {evt?.externalLink && (
                  <Anchor href={evt?.externalLink} target="_blank">
                    {evt.externalLink}
                  </Anchor>
                )}
              </Stack>
            </Box>
          )}
          <div id="tour-event-1">
            {items.length !== 0 ? (
              <>
                {/* <Group justify="center"> */}
                <div className={classes.root} ref={setRootRef}>
                  {controls}

                  <FloatingIndicator
                    target={selectedItemId ? controlsRefs[selectedItemId] : null}
                    parent={rootRef}
                    className={classes.indicator}
                  />
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onAddItem();
                  }}
                >
                  <Center mt="sm">
                    <Text size="sm"> Please select an item, or add a new item/band/act: </Text>
                    <TextInput
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      ml={"md"}
                      placeholder="Your item name"
                      rightSectionWidth={"80px"}
                      rightSection={
                        <Button
                          type="submit"
                          size="xs"
                          variant="transparent"
                          disabled={isItemsLoading}
                          loading={isItemCreating}
                          loaderProps={{ type: "bars" }}
                        >
                          Add item
                        </Button>
                      }
                    />
                  </Center>
                </form>
              </>
            ) : (
              <Center mt={"xl"}>
                <Stack>
                  <Text size="sm"> to get started, enter your item/band/act's name: </Text>
                  <TextInput
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    ml={"md"}
                    placeholder="Your item name"
                    rightSectionWidth={"80px"}
                    rightSection={
                      <Button size="xs" variant="transparent" onClick={() => onAddItem()}>
                        Add item
                      </Button>
                    }
                  />
                </Stack>
              </Center>
            )}
          </div>

          <Flex
            mt="md"
            style={{
              flexDirection: "row",
              alignItems: "start",
            }}
          >
            {/* Only for an existing item: without an id, a save would create a new item. */}
            {item && (
              <>
                <Stack flex={4}>
                  <DebouncedTextInput
                    inputComponent={CustomTextInput}
                    size="xxl"
                    placeholder="Your item name"
                    value={item.name}
                    onSave={(name) => saveItem({ id: item.id, name })}
                  />
                  <DebouncedTextarea
                    minRows={3}
                    variant="unstyled"
                    autosize
                    placeholder="Type a brief description or comments about your item"
                    value={item.comments ?? ""}
                    onSave={(comments) => saveItem({ id: item.id, comments })}
                    styles={{ input: { fontSize: "16px" } }}
                  />
                </Stack>
                <Divider orientation="vertical" mx="md" />
                <Stack flex={4}>
                  <Box>
                    <ConfirmDeleteButton
                      onConfirm={async () => {
                        if (!item) return;
                        await deleteItem(item.id);

                        // reset the selectedItem
                        setSelectedItemId("");
                      }}
                      buttonProps={{
                        variant: "filled",
                      }}
                      label="Delete item"
                    ></ConfirmDeleteButton>
                  </Box>
                </Stack>
              </>
            )}
          </Flex>
          {isUserNew && (
            <Stack mt="md">
              <Center>Looks like you're new here! Take a guided tour?</Center>
              <Center>
                <Button onClick={() => setTourActive(true, 1)}> Begin walkthrough</Button>
              </Center>
            </Stack>
          )}
        </Container>
      </Drawer>

      {/* Lyrics */}
      <Box
        style={{
          position: "absolute",
          left: "0.5rem",
          top: "0.5rem",
          zIndex: 1000,
        }}
      >
        <Button
          id="tour-event-2"
          size="xs"
          variant="light"
          onClick={toggleDrawerHandler.bind(null, toggleLyrics, "lyrics")}
        >
          {openedLyrics ? "Hide" : "Manage"} lyrics
        </Button>
      </Box>
      {/* Lyrics drawer */}
      <Drawer
        opened={openedLyrics}
        onClose={closeLyrics}
        keepMounted // closing only hides it: keeps scroll position and unsaved typing (and skips a re-render on reopen)
        keepMountedMode="display-none"
        position="left"
        size={`${lyricsWidth}vw`}
        // A side panel, not a modal: the visualiser next to it stays usable while the lyrics are open.
        withOverlay={false} // even a transparent overlay catches every click on the visualiser
        lockScroll={false} // scroll lock would also swallow the visualiser's scroll-to-zoom
        trapFocus={false}
        withCloseButton
        closeOnEscape
        closeOnClickOutside={false} // allow manipulating the 3d visualiser
        styles={resizableDrawerStyles}
      >
        <DrawerResizeHandle
          edge="right"
          label="Lyrics width"
          size={lyricsWidth}
          onResize={resizeLyrics}
          {...WIDTH_LIMITS}
        />
        <Lyrics itemId={selectedItemId} eventId={eventId} />
      </Drawer>

      {/* Lyrics "preview area" */}
      <Box
        className={classes.hideScrollbar}
        style={{
          position: "absolute",
          left: "0.5rem",
          // centered
          top: "50%",
          transform: "translateY(-50%)",
          // Enough for ~7 lines.
          height: "20rem",
          width: "26rem",
          overflowY: "auto", // "scroll" always reserves a scrollbar track
          zIndex: getDefaultZIndex("modal") - 1, // below all modals
        }}
      >
        <Box style={{ zoom: 0.75 }}>
          <RichContentWrapper itemId={selectedItemId} eventId={eventId} />
        </Box>
      </Box>

      {/* Cues */}
      <Box
        style={{
          position: "absolute",
          right: "0.5rem",
          top: "0.5rem",
          zIndex: 1000,
        }}
      >
        <Button
          id="tour-event-6"
          size="xs"
          variant="light"
          onClick={toggleDrawerHandler.bind(null, toggleCues, "cues")}
        >
          {openedCues ? "Hide" : "Show"} cues
        </Button>
      </Box>

      {/* Visualiser resolution scale */}
      <Box
        style={{
          position: "absolute",
          right: "0.5rem",
          bottom: "0.5rem",
          zIndex: getDefaultZIndex("modal") - 1, // below all modals
        }}
      >
        <ResolutionScaleSelect />
      </Box>

      {/* Cues drawer */}
      <Drawer
        opened={openedCues}
        onClose={closeCues}
        keepMounted // closing only hides it: cue cards keep their state and don't re-render on reopen
        keepMountedMode="display-none"
        position="right"
        size={`${cuesWidth}vw`}
        // A side panel, not a modal: the visualiser next to it stays usable while the lyrics are open.
        withOverlay={false} // even a transparent overlay catches every click on the visualiser
        lockScroll={false} // scroll lock would also swallow the visualiser's scroll-to-zoom
        trapFocus={false}
        withCloseButton
        closeOnEscape
        closeOnClickOutside={false} // allow manipulating the 3d visualiser
        styles={resizableDrawerStyles}
      >
        <DrawerResizeHandle edge="left" label="Cues width" size={cuesWidth} onResize={resizeCues} {...WIDTH_LIMITS} />
        <Cues eventId={eventId} itemId={selectedItemId} />
      </Drawer>

      {/* Buttons for Timeline and DMX drawer */}
      <Box
        style={{
          position: "absolute",
          left: "50%",
          bottom: "0.5rem",
          transform: "translateX(-50%)",
          zIndex: getDefaultZIndex("modal") - 1,
        }}
      >
        <Group>
          <Button size="xs" variant="light" onClick={() => toggleDrawerHandler(toggleTimeline, "timeline")}>
            {openedTimeline ? "Hide" : "Show"} timeline
          </Button>
          <Button size="xs" variant="light" onClick={() => toggleDrawerHandler(toggleDmx, "dmx")}>
            {isDmxDrawerOpen ? "Hide" : "Show"} DMX overrides
          </Button>
        </Group>
      </Box>

      {/* Timeline drawer */}
      <Drawer
        opened={openedTimeline}
        onClose={() => closeTimeline()}
        keepMounted // closing only hides it: keeps scroll position and unsaved typing (and skips a re-render on reopen)
        keepMountedMode="display-none"
        position="bottom"
        size={`${timelineHeight}vh`}

        withOverlay={false}
        lockScroll={false} // scroll lock would also swallow the visualiser's scroll-to-zoom
        trapFocus={false}
        withCloseButton={false}
        closeOnEscape={false} // handled by the useWindowEvent above, so Escape in a modal over the timeline only closes the modal
        closeOnClickOutside={false} // allow manipulating the 3d visualiser

        zIndex={getDefaultZIndex("modal") + 1} // above the Lyrics and Cues drawers (both 200)
        scrollAreaComponent={undefined}

        styles={{
          body: {
            height: "100%",
            padding: 0,
            paddingTop: 12,
            overflow: "hidden",
            position: "relative",
            display: "flex",
            flexDirection: "column",
          },
        }} // reserve space for the resize handle
      >
        <DrawerResizeHandle
          edge="top"
          label="Timeline height"
          size={timelineHeight}
          onResize={resizeTimeline}
          {...HEIGHT_LIMITS}
        />
        <TimelineDrawerContainer eventId={eventId} itemId={selectedItemId} onClose={closeTimeline} />
      </Drawer>

      {/* Help button */}
      <Box
        style={{
          position: "absolute",
          left: "0.5rem",
          bottom: "0.5rem",
          zIndex: getDefaultZIndex("modal") - 1,
        }}
      >
        <Button
          variant="outline"
          color="gray"
          size="xs"
          leftSection={<IconHelpCircle width="1rem" />}
          onClick={() => setIsHelpDialogOpen(true)}
        >
          Help
        </Button>
      </Box>

      {/* Help Modal (note: not a drawer) */}
      <Modal
        opened={isHelpDialogOpen}
        onClose={closeHelpDialog}
        title="Help"
        size="lg"
        overlayProps={{ opacity: 0.5, blur: 4 }}
        closeOnEscape
        closeOnClickOutside
        centered
        zIndex={getDefaultZIndex("modal") + 1} // above the Lyrics and Cues drawers (both 200)
      >
        <HelpContent />
      </Modal>

      {/* Main visualiser */}
      <Box h="100dvh" w="100%" id="tour-event-9">
        {visualiser ? (
          <VisualiserInputProcessor
            key={visualiser.id}
            visualiser={visualiser}
            eventId={eventId}
            fixtures={patchedFixtures}
            dmxValues={dmxValuesWithOverrides}
            effectPlayback={effectPlayback}
            cueFade={cueFade}
            selectedFixtureIds={selectedFixtureIds}
            onFixtureSelect={onFixtureSelect}
          />
        ) : (
          <Center h="100%">{isVisualiserLoading ? <Loader type="bars" /> : <Text>No visualiser found</Text>}</Center>
        )}
      </Box>
    </>
  );
};
