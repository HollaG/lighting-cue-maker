import {
  Alert,
  Anchor,
  Box,
  Button,
  Center,
  Code,
  Collapse,
  Container,
  Divider,
  FloatingIndicator,
  Group,
  Menu,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useAppStore } from "../../store/appStore";
import classes from "./ChoreoEventWrapper.module.css";
import { RichContent } from "../../components/RichContent/RichContent";
import { useEffect, useMemo, useState } from "react";
import { CueList } from "./CueList/CueList";
import { useGetEvent } from "../../query/useGetEvent";
import { useGetItems } from "../../query/useGetItems";
import { useGetItem } from "../../query/useGetItem";
import { type InputMode } from "../../store/slices/lyricsSlice";
import { useCreateItem } from "../../query/useCreateItem";
import { useUpdateItem } from "../../query/useUpdateItem";
import type { BumpConfiguration } from "../../types/types";
import { IconInfoCircle } from "@tabler/icons-react";

export const ChoreoEventWrapper = () => {
  // NOTE: evt is nullable!! remember to check
  const code = useAppStore((s) => s.code);
  const { event: evt, isValidEvent } = useGetEvent({ code });
  const activeItemId = useAppStore((s) => s.activeItemId);

  const { items, isItemsLoading } = useGetItems({ eventId: evt?.id ?? "" });
  const { item } = useGetItem({ itemId: activeItemId ?? undefined });

  const { mutate: createItem, isPending: isItemCreating } = useCreateItem();
  const { mutate: updateItem } = useUpdateItem();

  const changeActiveItem = useAppStore((s) => s.changeActiveItem);
  const itemName = useAppStore((s) => s.itemName);
  const setItemName = useAppStore((s) => s.setItemName);
  const inputMode = useAppStore((s) => s.inputMode);
  const setInputMode = useAppStore((s) => s.setInputMode);

  const instantBumpMode = useAppStore((s) => s.instantAddBumpMode);
  const setInstantBumpMode = useAppStore((s) => s.setInstantAddBumpMode);
  const setDerivedLyrics = useAppStore((s) => s.setDerivedLyrics);

  const [internalRawLyrics, setInternalRawLyrics] = useState<string>("");

  useEffect(() => {
    const lyrics = item?.rawLyrics ?? "";
    setInternalRawLyrics(lyrics);
    setDerivedLyrics(lyrics);
  }, [item?.rawLyrics]);

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
    // setRawLyrics(rawLyrics.replaceAll("\n\n\n", "\n\n"));
    setInternalRawLyrics(internalRawLyrics.replaceAll("\n\n\n", "\n\n"));
  };

  useEffect(() => {
    if (item?.rawLyrics === "") {
      setInputMode("raw");
    }
  }, [item?.rawLyrics]);

  const getIndicatorText = (inputMode: InputMode, bumpDefault?: BumpConfiguration | null) => {
    if (inputMode === "raw") return "Edit lyrics";
    if (inputMode === "cue") return "Configure cues";
    if (inputMode === "bump") {
      return `Configure bump: ${bumpDefault?.name}`;
    }
  };

  return (
    <Collapse expanded={isValidEvent}>
      <Container size={"xl"}>
        <Divider my="lg" label="create your lighting plan" labelPosition="center" />
        <Container my="xl" ml={0}>
          <Stack>
            <Title>{evt?.name}</Title>
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
                    size="xs"
                    variant="transparent"
                    onClick={() => onAddItem()}
                    disabled={isItemsLoading}
                    loading={isItemCreating}
                  >
                    Add item
                  </Button>
                }
              />
            </Center>
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
      <Container fluid>
        {!!item && (
          <SimpleGrid cols={2} px="xl" mt="3rem">
            <Stack>
              <Group>
                <Title order={3} flex={1}>
                  Lyrics
                </Title>
                {inputMode == "raw" && (
                  <Group>
                    <Button size="xs" variant="subtle" color="black" onClick={deleteExtraSpaces}>
                      Remove extra line breaks
                    </Button>
                  </Group>
                )}

                <Menu shadow="md" width={"200px"} position="bottom-end">
                  <Menu.Target>
                    {/* <Button>Change input mode</Button> */}
                    <Box style={{ width: "250px" }}>
                      <Select
                        description="Editor mode"
                        width={"200px"}
                        data={[getIndicatorText(inputMode, instantBumpMode) || ""]}
                        value={getIndicatorText(inputMode, instantBumpMode) || ""}
                        readOnly
                      />
                    </Box>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Item onClick={() => setInputMode("raw")}> Edit lyrics</Menu.Item>
                    <Menu.Item onClick={() => onClickFinishAddingLyricsButton("cue")}> Configure cues</Menu.Item>
                    {evt?.bumpConfigurations && evt.bumpConfigurations.length ? (
                      <Menu.Sub>
                        <Menu.Sub.Target>
                          <Menu.Sub.Item> Configure bumps</Menu.Sub.Item>
                        </Menu.Sub.Target>
                        <Menu.Sub.Dropdown>
                          {evt.bumpConfigurations.map((bumpConfig) => (
                            <Menu.Item
                              onClick={() => {
                                setInstantBumpMode(bumpConfig);
                                onClickFinishAddingLyricsButton("bump");
                              }}
                              key={bumpConfig.id}
                            >
                              {bumpConfig.name}
                            </Menu.Item>
                          ))}
                        </Menu.Sub.Dropdown>
                      </Menu.Sub>
                    ) : null}
                  </Menu.Dropdown>
                </Menu>

                {/* <Input.Wrapper label="Input mode" mx={0}>
                  <Select data={InputModes} value={inputMode} onChange={(value) => setInputMode(value as InputMode)} />
                </Input.Wrapper> */}
              </Group>

              <Alert variant="light" color="lime" icon={<IconInfoCircle />}>
                {inputMode === "raw" ? (
                  <Stack gap={"xs"}>
                    <span>
                      You can add any lyrics / spoken word during your set here. Once done, switch the editor mode to
                      configure cues/bumps.{" "}
                    </span>
                    <span>
                      Do not modify the embedded cue/bump data (<Code>{`<cueId=...=cueId>`}</Code>)
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

              {(inputMode === "cue" || inputMode === "bump") && <RichContent itemId={item.id} />}
            </Stack>
            <Stack>
              <Group>
                <Title order={3} flex={1}>
                  Cues
                </Title>
                {/* <Box>
                  <Button size="xs" variant="outline" onClick={() => onBeginAddingLyrics()}>
                    Save all
                  </Button>
                </Box> */}
              </Group>
              <CueList itemId={item.id} />
            </Stack>
          </SimpleGrid>
        )}
      </Container>
    </Collapse>
  );
};
