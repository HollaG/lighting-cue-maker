import {
  Alert,
  Anchor,
  Box,
  Button,
  Center,
  Code,
  Container,
  Drawer,
  Flex,
  FloatingIndicator,
  Group,
  Image,
  Kbd,
  Menu,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useAppStore } from "../../store/appStore";
import classes from "./EventPage.module.css";
import { RichContent } from "../../components/RichContent/RichContent";
import { useEffect, useMemo, useRef, useState } from "react";
// import { CueList } from "./CueList/CueList";
import { useGetEvent } from "../../query/useGetEvent";
import { useGetItems } from "../../query/useGetItems";
import { useGetItem } from "../../query/useGetItem";
import { type InputMode } from "../../store/slices/lyricsSlice";
import { useCreateItem } from "../../query/useCreateItem";
import { useUpdateItem } from "../../query/useUpdateItem";
import { IconArrowLeft, IconFileSpreadsheet, IconInfoCircle } from "@tabler/icons-react";
import { useDisclosure, useHotkeys, type HotkeyItem } from "@mantine/hooks";
import { sanitize } from "../../utils/sanitize";
import { ContentControl } from "../../components/ContentControl/ContentControl";
import { useNavigate, useParams } from "@tanstack/react-router";
import { saveRecentEvent } from "../../utils/recentEvents";
import { CueList } from "../../sections/ChoreoEvent/CueList/CueList";
import { QLCConverter } from "../../sections/QLCConverter/QLCConverter";

import QlcLogo from "../../assets/qlc_logo.svg";

export const EventPage = () => {
  // NOTE: evt is nullable!! remember to check

  const { eventId } = useParams({
    from: "/events/$eventId/",
  });

  const { event: evt } = useGetEvent({ eventId });
  const loadedEventId = evt?.id;
  const loadedEventName = evt?.name;

  useEffect(() => {
    if (!loadedEventId || !loadedEventName) return;

    saveRecentEvent({
      eventId: loadedEventId,
      eventName: loadedEventName,
    });
  }, [loadedEventId, loadedEventName]);

  const activeItemId = useAppStore((s) => s.activeItemId);
  const showCues = useAppStore((s) => s.showCues);
  const toggleShowCues = useAppStore((s) => s.toggleShowCues);

  const { items, isItemsLoading } = useGetItems({ eventId });

  const validActiveItemId = items.some((item) => item.id === activeItemId) ? activeItemId : undefined;

  const { item } = useGetItem({ itemId: validActiveItemId ?? undefined });

  const { mutate: createItem, isPending: isItemCreating } = useCreateItem();
  const { mutate: updateItem } = useUpdateItem();

  const changeActiveItem = useAppStore((s) => s.changeActiveItem);
  const itemName = useAppStore((s) => s.itemName);
  const setItemName = useAppStore((s) => s.setItemName);
  const inputMode = useAppStore((s) => s.inputMode);
  const setInputMode = useAppStore((s) => s.setInputMode);

  const inputTimingMode = useAppStore((s) => s.inputTimingMode);

  const instantBumpMode = useAppStore((s) => s.instantAddBumpMode);
  const setDerivedLyrics = useAppStore((s) => s.setDerivedLyrics);

  const [internalRawLyrics, setInternalRawLyrics] = useState<string>("");

  const setIndicatorNumber = useAppStore((s) => s.setIndicatorNumber);

  const contentRef = useRef<HTMLDivElement>(null);

  // Hotkeys for timing indicators
  useHotkeys([1, 2, 3, 4, 5, 6, 7, 8].map((i): HotkeyItem => [i.toString(), () => setIndicatorNumber(i)]));

  useEffect(() => {
    const lyrics = item?.rawLyrics ?? "";
    setInternalRawLyrics(sanitize(lyrics));
    setDerivedLyrics(sanitize(lyrics));
  }, [item?.rawLyrics, sanitize]);

  // for the Item selection
  const [rootRef, setRootRef] = useState<HTMLDivElement | null>(null);
  const [controlsRefs, setControlsRefs] = useState<Record<string, HTMLButtonElement | null>>({});

  const setControlRef = (id: string) => (node: HTMLButtonElement | null) => {
    setControlsRefs((prev) => ({ ...prev, [id]: node }));
  };
  const onClickFinishAddingLyricsButton = (switchTo: InputMode) => {
    // setRawLyrics(internalRawLyrics);
    saveUpdatedRawLyrics();
    setInputMode(switchTo);
  };

  const saveUpdatedRawLyrics = () => {
    if (!activeItemId) return;
    updateItem({
      itemId: activeItemId,
      requestBody: {
        rawLyrics: internalRawLyrics,
      },
    });
  };

  const onAddItem = () => {
    if (!evt?.id || !itemName.trim()) return;
    createItem({
      eventId: evt.id,
      name: itemName,
    });
  };

  const controls = useMemo(() => {
    return items.map((item) => (
      <UnstyledButton
        key={item.id}
        className={classes.control}
        ref={setControlRef(item.id)}
        onClick={() => changeActiveItem(item.id)}
        mod={{ active: activeItemId === item.id }}
        p={"xs"}
      >
        <span className={classes.controlLabel}>{item.name}</span>
      </UnstyledButton>
    ));
  }, [items, activeItemId]);

  const deleteExtraSpaces = () => {
    setInternalRawLyrics(internalRawLyrics.replaceAll("\n\n\n", "\n\n"));
  };

  useEffect(() => {
    if (item?.rawLyrics === "") {
      setInputMode("raw");
    }
  }, [item?.rawLyrics]);

  const navigate = useNavigate();
  const onEdit = () =>
    navigate({
      to: "/events/$eventId/edit",
      params: { eventId },
    });

  // QLC+ export controls
  const [openedQlcExport, { open: openQlcExport, close: closeQlcExport }] = useDisclosure(false);

  return (
    <>
      <Container size={"xl"} mt="4rem">
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
          <Box>
            <Button size="xs" variant="outline" onClick={toggleShowCues}>
              {showCues ? "Hide " : "Show "}cues
            </Button>
          </Box>
          <Button onClick={onEdit} variant="transparent" color="lime">
            Edit event
          </Button>
          <Menu shadow={"sm"} withArrow position="bottom">
            <Menu.Target>
              <Button variant="light">Export</Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Export options</Menu.Label>
              <Menu.Item leftSection={<Image src={QlcLogo} width={16} height={16} />} onClick={openQlcExport}>
                QLC+ export
              </Menu.Item>
              <Menu.Item leftSection={<IconFileSpreadsheet width={"1rem"} />}>.xlsx sheet (WIP)</Menu.Item>
            </Menu.Dropdown>
          </Menu>
          {/* <Button onClick={openQlcExport} variant="light">
            Export
          </Button> */}
        </Group>

        <Container my="xl" ml={0}>
          <Stack>
            <Group gap={0}>
              <Title>{evt?.name}</Title>
              {/* <Button onClick={onEdit} variant="transparent" color="lime">
                Edit event
              </Button> */}
            </Group>
            <Text> {evt?.description}</Text>
            {evt?.externalLink && (
              <Anchor href={evt?.externalLink} target="_blank">
                {evt.externalLink}
              </Anchor>
            )}
          </Stack>
        </Container>
        {items.length !== 0 ? (
          <>
            {/* <Group justify="center"> */}
            <div className={classes.root} ref={setRootRef}>
              {controls}

              <FloatingIndicator
                target={activeItemId ? controlsRefs[activeItemId] : null}
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
      <Container fluid={showCues} size={!showCues ? "xl" : undefined}>
        {!!item && (
          <SimpleGrid cols={showCues ? 2 : 1} px="xl" mt="3rem" style={{ position: "relative" }}>
            <Stack>
              <Group>
                <Flex flex={1}>
                  <ContentControl
                    showCues={showCues}
                    deleteExtraSpaces={deleteExtraSpaces}
                    eventId={evt?.id || ""}
                    onFinishAddingLyrics={onClickFinishAddingLyricsButton}
                  />
                </Flex>
              </Group>
              <Alert
                variant="light"
                color="lime"
                icon={<IconInfoCircle />}
                style={{
                  transition: "all 0.3s ease",
                }}
              >
                {inputMode === "raw" ? (
                  <Stack gap={"xs"}>
                    <span>
                      You can add any lyrics / spoken word during your set here. Once done, switch the editor mode to
                      configure cues/bumps.{" "}
                    </span>
                    <span>
                      Do not modify the embedded cue/bump data (<Code>{`{cueId=...=cueId}`}</Code>)
                    </span>
                    <span>Tip: use a hyphen (-) if you need to separate syllables.</span>
                  </Stack>
                ) : (
                  ""
                )}

                {inputMode === "cue" ? (
                  <Stack gap="xs">
                    <span>Click on any word or space to add a cue at that point.</span>
                    <span>
                      Tip: need to put a cue on a syllable? Use a hyphen (-) in <Code>Edit lyrics</Code> mode to
                      separate the syllables.
                    </span>
                  </Stack>
                ) : (
                  <></>
                )}

                {inputMode === "bump" ? (
                  <Stack gap="xs">
                    <span>
                      Click on any word or space to add a bump for <Code>{instantBumpMode?.name}</Code> at that point. A
                      bump is an instantaneous effect that will flash only at the point you specify.
                    </span>
                    Click again to remove.
                  </Stack>
                ) : (
                  <></>
                )}

                {inputMode === "timing" ? (
                  <Stack gap="xs">
                    <span>
                      {" "}
                      First, set the beat number you want to add by pressing <Kbd>1</Kbd> ... <Kbd>8</Kbd> on your
                      keyboard, or use the "Beat to add" input.
                    </span>
                    <span>
                      {" "}
                      Then, click on any word or space to indicate the <Code>{inputTimingMode} beat</Code>.
                    </span>
                  </Stack>
                ) : (
                  <></>
                )}
              </Alert>
              {inputMode === "raw" && (
                <Textarea
                  variant="unstyled"
                  autosize
                  className={classes["lyric-input"]}
                  value={internalRawLyrics}
                  onChange={(e) => setInternalRawLyrics(e.target.value)}
                  placeholder="Paste all your lyrics here! You can also include band introductions or other improv stuff."
                  styles={{
                    input: { fontSize: "16px" }, // Or use rem units like '1.25rem'
                  }}
                  minRows={14}
                />
              )}

              {(inputMode === "cue" || inputMode === "bump" || inputMode === "timing") && (
                <div ref={contentRef} id="focus-trap-lyrics" tabIndex={-1} style={{ outline: "none" }}>
                  <RichContent itemId={item.id} />
                </div>
              )}
            </Stack>
            {showCues && evt ? (
              <Stack>
                <Group>
                  <Title order={3} flex={1}>
                    Cues
                  </Title>
                </Group>
                <CueList itemId={item.id} fixtureGroups={evt?.fixtureGroups ?? []} />
              </Stack>
            ) : (
              <></>
            )}
          </SimpleGrid>
        )}
      </Container>

      <Drawer
        keepMounted
        position="right"
        size={"full"}
        opened={openedQlcExport}
        onClose={closeQlcExport}
        title="QLC+ export"
      >
        {evt && <QLCConverter event={evt} />}
      </Drawer>
    </>
  );
};
