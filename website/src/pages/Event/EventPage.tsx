import {
  Anchor,
  Box,
  Button,
  Center,
  Container,
  Drawer,
  Flex,
  FloatingIndicator,
  getDefaultZIndex,
  Group,
  Image,
  Loader,
  Menu,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure, useLocalStorage } from "@mantine/hooks";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useGetEvent } from "../../query-v2/events/useGetEvent";
import { useGetItems } from "../../query-v2/items/useGetItems";
import { useUpsertItem } from "../../query-v2/items/useUpsertItem";
import { useGetPatchedFixtures } from "../../query-v2/patched-fixtures/useGetPatchedFixtures";
import { useGetVisualiser } from "../../query-v2/visualiser/useGetVisualiser";
import { StaticVisualiser3D } from "../../components/Visualiser3D-v2/Visualiser3D";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore } from "../../store/appStore";
import { Logger } from "../../utils/logger";
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
} from "@tabler/icons-react";
import { Lyrics } from "../../components/Event/Lyrics";
import { Cues } from "../../components/Event/Cues";
import { popTransition } from "../../utils/animations";
import { VisualiserInputProcessor } from "../../components/Visualiser3D-v2/Processing/VisualiserInputProcessor";
import { ResolutionScaleSelect } from "../../components/Visualiser3D-v2/ResolutionScaleSelect";
import { useResolvedDmx } from "../../hooks/useResolvedDmx";
import { DMXControlWrapper } from "../../components/DMX/DMXControlWrapper";

const logger = new Logger("EventPage.tsx");

export const EventPage = () => {
  const { eventId } = useParams({
    from: "/events/$eventId/",
  });
  const [openedEventDetails, { open: openEventDetails, close: closeEventDetails, toggle: toggleEventDetails }] =
    useDisclosure(false);

  const [openedLyrics, { open: openLyrics, close: closeLyrics, toggle: toggleLyrics }] = useDisclosure(false);
  const [openedCues, { open: openCues, close: closeCues, toggle: toggleCues }] = useDisclosure(false);
  // for DMX drawer, the open/close state is in the app store, so that each individual CueCard can open it remotely.
  const isDmxDrawerOpen = useAppStore((s) => s.isDmxDrawerOpen);
  const setIsDmxDrawerOpen = useAppStore((s) => s.setIsDmxDrawerOpen);

  const toggleDrawerHandler = (toggleCb: () => void, domain: "event" | "lyrics" | "cues") => {
    // only one drawer can be open at a time, so close the others if its open
    if (domain === "event") {
      closeLyrics();
      closeCues();
    } else if (domain === "lyrics") {
      closeEventDetails();
    } else if (domain === "cues") {
      closeEventDetails();
    }
    toggleCb();
  };

  // hooks to get data
  const { event: evt, isEventLoading } = useGetEvent(eventId); // NOTE: evt is nullable, remember to check
  const { items, isItemsLoading } = useGetItems(eventId);
  const { visualiser, isVisualiserLoading } = useGetVisualiser(eventId);
  const { patchedFixtures } = useGetPatchedFixtures(eventId);
  const { dmxValuesWithOverrides: dmxValuesByFixture, isLoading } = useResolvedDmx(eventId, patchedFixtures);

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

  const selectedItem = items.find((item) => item.id === selectedItemId);

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

  return (
    <>
      {/* Centered pull-down */}
      <Box
        style={{
          position: "absolute",
          top: "0.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
        }}
      >
        <Button size="xs" variant="outline" onClick={toggleDrawerHandler.bind(null, toggleEventDetails, "event")}>
          {openedEventDetails ? "Close" : "Open"} event details
        </Button>
      </Box>

      {/* DMX overrides */}
      {/* <Drawer */}
      <Drawer
        opened={isDmxDrawerOpen}
        onClose={() => setIsDmxDrawerOpen(false)}
        keepMounted // closing only hides it: keeps scroll position and unsaved typing (and skips a re-render on reopen)
        position="bottom"
        size="30vh"
        // A side panel, not a modal: the visualiser next to it stays usable while the lyrics are open.
        withOverlay={false} // even a transparent overlay catches every click on the visualiser
        lockScroll={false} // scroll lock would also swallow the visualiser's scroll-to-zoom
        trapFocus={false}
        withCloseButton={false}
        closeOnEscape
        closeOnClickOutside={false} // allow manipulating the 3d visualiser

        zIndex={getDefaultZIndex("modal") + 1} // above the Lyrics and Cues drawers (both 200)
        scrollAreaComponent={undefined}

        styles={{ body: { height: "100%", padding: 0, paddingTop: "var(--mantine-spacing-xs)" } }} // force the drawer body to be 100% height, never overflow
      >
        {isLoading ? (
          <Center h="100%">
            <Loader type="bars" />
          </Center>
        ) : !dmxValuesByFixture ? (
          <Center h="100%">
            <Text c="dimmed" size="sm">
              Select a cue to control the fixtures
            </Text>
          </Center>
        ) : (
          <DMXControlWrapper itemId={selectedItemId} eventId={eventId} dmxValuesByFixtureId={dmxValuesByFixture} />
        )}
      </Drawer>

      {/* Drawer for changing items */}
      <Drawer
        opened={openedEventDetails}
        onClose={closeEventDetails}
        position="top"
        size="lg"
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
        <Button size="xs" variant="light" onClick={toggleDrawerHandler.bind(null, toggleLyrics, "lyrics")}>
          {openedLyrics ? "Hide" : "Show"} lyrics
        </Button>
      </Box>
      {/* Lyrics drawer */}
      <Drawer
        opened={openedLyrics}
        onClose={closeLyrics}
        keepMounted // closing only hides it: keeps scroll position and unsaved typing (and skips a re-render on reopen)
        position="left"
        size="lg"
        // A side panel, not a modal: the visualiser next to it stays usable while the lyrics are open.
        withOverlay={false} // even a transparent overlay catches every click on the visualiser
        lockScroll={false} // scroll lock would also swallow the visualiser's scroll-to-zoom
        trapFocus={false}
        withCloseButton
        closeOnEscape
        closeOnClickOutside={false} // allow manipulating the 3d visualiser
      >
        <Lyrics itemId={selectedItemId} eventId={eventId} />
      </Drawer>

      {/* Cues */}
      <Box
        style={{
          position: "absolute",
          right: "0.5rem",
          top: "0.5rem",
          zIndex: 1000,
        }}
      >
        <Button size="xs" variant="light" onClick={toggleDrawerHandler.bind(null, toggleCues, "cues")}>
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
        position="right"
        size="lg"
        // A side panel, not a modal: the visualiser next to it stays usable while the lyrics are open.
        withOverlay={false} // even a transparent overlay catches every click on the visualiser
        lockScroll={false} // scroll lock would also swallow the visualiser's scroll-to-zoom
        trapFocus={false}
        withCloseButton
        closeOnEscape
        closeOnClickOutside={false} // allow manipulating the 3d visualiser
      >
        <Cues eventId={eventId} itemId={selectedItemId} />
      </Drawer>

      {/* Main visualiser */}
      <Box h="100dvh" w="100%">
        {visualiser ? (
          <VisualiserInputProcessor
            key={visualiser.id}
            visualiser={visualiser}
            eventId={eventId}
            fixtures={patchedFixtures}
            dmxValues={dmxValuesByFixture}
          />
        ) : (
          <Center h="100%">{isVisualiserLoading ? <Loader type="bars" /> : <Text>No visualiser found</Text>}</Center>
        )}
      </Box>
    </>
  );
};
