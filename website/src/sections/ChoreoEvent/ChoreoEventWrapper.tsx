import {
  Anchor,
  Box,
  Button,
  Card,
  Center,
  Collapse,
  Container,
  Divider,
  Flex,
  FloatingIndicator,
  Group,
  Scroller,
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
import { CueCard } from "../../components/Siding/CueCard/CueCard";
import { useState } from "react";
import { CardBase } from "../../components/Siding/CardBase";
import type { LightEventConfiguration } from "../../types/types";

export const ChoreoEventWrapper = () => {
  // NOTE: evt is nullable!! remember to check
  const evt = useAppStore((s) => s.event as LightEventConfiguration | null);
  const isValidEvent = useAppStore((s) => s.isValidEvent);
  const activeItem = useAppStore((s) => s.activeItem);
  const changeActiveItem = useAppStore((s) => s.changeActiveItem);
  const items = useAppStore((s) => s.items);
  const itemName = useAppStore((s) => s.itemName);
  const setItemName = useAppStore((s) => s.setItemName);
  const onAddItem = useAppStore((s) => s.onAddItem);
  const lyricInputMode = useAppStore((s) => s.lyricInputMode);
  const rawLyrics = useAppStore((s) => s.rawLyrics);
  const setRawLyrics = useAppStore((s) => s.setRawLyrics);
  const onFinishAddingLyrics = useAppStore((s) => s.onFinishAddingLyrics);
  const onBeginAddingLyrics = useAppStore((s) => s.onBeginAddingLyrics);
  const cueOrder = useAppStore((s) => s.cueOrder);
  const cues = useAppStore((s) => s.cues);

  // for the Item selection
  const [rootRef, setRootRef] = useState<HTMLDivElement | null>(null);
  const [controlsRefs, setControlsRefs] = useState<Record<string, HTMLButtonElement | null>>({});

  const setControlRef = (id: string) => (node: HTMLButtonElement) => {
    controlsRefs[id] = node;
    setControlsRefs(controlsRefs);
  };

  const controls = items.map((item, index) => (
    <UnstyledButton
      key={item.id}
      className={classes.control}
      ref={setControlRef(item.id)}
      onClick={() => changeActiveItem(item)}
      mod={{ active: activeItem?.id === item.id }}
      p={"xs"}
    >
      <span className={classes.controlLabel}>{item.name}</span>
    </UnstyledButton>
  ));

  const deleteExtraSpaces = () => {
    setRawLyrics(rawLyrics.replaceAll("\n\n\n", "\n\n"));
  };

  console.log({ rawLyrics });

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

              <FloatingIndicator target={controlsRefs[activeItem?.id]} parent={rootRef} className={classes.indicator} />
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
                  <Button size="xs" variant="transparent" onClick={onAddItem}>
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
                  <Button size="xs" variant="transparent" onClick={onAddItem}>
                    Add item
                  </Button>
                }
              />
            </Stack>
          </Center>
        )}
      </Container>
      <Container fluid>
        {!!activeItem && (
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
                      <Button size="xs" color="green" onClick={() => onFinishAddingLyrics()}>
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
                  value={rawLyrics}
                  onChange={(e) => setRawLyrics(e.target.value)}
                  placeholder="Paste all your lyrics here! You can also include band introductions or other improv stuff."
                  styles={{
                    input: { fontSize: "16px" }, // Or use rem units like '1.25rem'
                  }}
                  minRows={14}
                />
              )}

              {lyricInputMode === "rich" && <RichContent />}
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
              {cueOrder.map((cueId, index) => {
                let cue = cues.find((c) => c.id === cueId);
                if (!cue) return null;
                return <CueCard key={cue.id} cue={cue} cueNumber={index + 1} />;
              })}
            </Stack>
          </SimpleGrid>
        )}
      </Container>
    </Collapse>
  );
};
