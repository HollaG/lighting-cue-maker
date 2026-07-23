import {
  Anchor,
  Box,
  Button,
  Center,
  Collapse,
  Container,
  Divider,
  FloatingIndicator,
  Group,
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

export const ChoreoEventWrapper = () => {
  // NOTE: evt is nullable!! remember to check
  const code = useAppStore((s) => s.code);
  const { event: evt, isValidEvent } = useGetEvent({ code });
  const activeItemId = useAppStore((s) => s.activeItemId);

  const { items, refetchItems } = useGetItems({ eventId: evt?.id ?? "" });
  const { item, refetchItem } = useGetItem({ eventId: evt?.id ?? "", itemId: activeItemId ?? undefined });

  const changeActiveItem = useAppStore((s) => s.changeActiveItem);
  const itemName = useAppStore((s) => s.itemName);
  const setItemName = useAppStore((s) => s.setItemName);
  const onAddItem = useAppStore((s) => s.onAddItem);
  const lyricInputMode = useAppStore((s) => s.lyricInputMode);
  const onFinishAddingLyrics = useAppStore((s) => s.onFinishAddingLyrics);
  const onBeginAddingLyrics = useAppStore((s) => s.onBeginAddingLyrics);

  const [internalRawLyrics, setInternalRawLyrics] = useState<string>("");

  useEffect(() => {
    setInternalRawLyrics(item?.rawLyrics ?? "");
  }, [item?.rawLyrics]);

  // for the Item selection
  const [rootRef, setRootRef] = useState<HTMLDivElement | null>(null);
  const [controlsRefs, setControlsRefs] = useState<Record<string, HTMLButtonElement | null>>({});

  const setControlRef = (id: string) => (node: HTMLButtonElement) => {
    controlsRefs[id] = node;
    setControlsRefs(controlsRefs);
  };
  const onClickFinishAddingLyricsButton = () => {
    // setRawLyrics(internalRawLyrics);
    onFinishAddingLyrics(internalRawLyrics, evt, refetchItem);
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
                  <Button size="xs" variant="transparent" onClick={() => onAddItem(evt, refetchItems)}>
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
                  <Button size="xs" variant="transparent" onClick={() => onAddItem(evt, refetchItems)}>
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
                <Box>
                  {lyricInputMode == "raw" && (
                    <Group>
                      <Button size="xs" variant="subtle" color="black" onClick={deleteExtraSpaces}>
                        Remove extra line breaks
                      </Button>
                      <Button size="xs" color="green" onClick={() => onClickFinishAddingLyricsButton()}>
                        {" "}
                        Finish adding
                      </Button>
                    </Group>
                  )}
                  {lyricInputMode == "rich" && (
                    <Button size="xs" variant="outline" onClick={() => onBeginAddingLyrics()}>
                      {" "}
                      Add lyrics{" "}
                    </Button>
                  )}
                </Box>
              </Group>
              {lyricInputMode === "raw" && (
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

              {lyricInputMode === "rich" && <RichContent itemId={item.id} />}
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
              <CueList eventId={evt?.id} itemId={item.id} />
            </Stack>
          </SimpleGrid>
        )}
      </Container>
    </Collapse>
  );
};
