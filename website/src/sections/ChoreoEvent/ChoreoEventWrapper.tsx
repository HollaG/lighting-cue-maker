import {
  Box,
  Button,
  Center,
  Collapse,
  Container,
  Divider,
  Flex,
  Group,
  Scroller,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useAppContext } from "../../context/AppContext";
import classes from "./ChoreoEventWrapper.module.css";
import { RichContent } from "../../components/RichContent/RichContent";
import { CueCard } from "../../components/Siding/CueCard/CueCard";
import { convertUuidForDatabase } from "../../utils/convertUuid";

export const ChoreoEventWrapper = () => {
  const {
    isValidEvent,
    activeItem,
    changeActiveItem,
    items,
    itemName,
    setItemName,
    onAddItem,
    lyricInputMode,
    rawLyrics,
    setRawLyrics,
    onFinishAddingLyrics,
    onBeginAddingLyrics,
    cueOrder,
    cues,
  } = useAppContext();

  return (
    <Collapse expanded={isValidEvent}>
      <Container size={"xl"}>
        <Divider my="lg" label="create your lighting plan" labelPosition="center" />
        <Scroller>
          <Group gap={"xs"} wrap="nowrap">
            {items.map((b) => (
              <Button
                key={b.id}
                size="xs"
                variant={activeItem?.id === b.id ? "filled" : "outline"}
                color={activeItem?.id === b.id ? "blue" : "gray"}
                onClick={() => changeActiveItem(b)}
              >
                {" "}
                {b.name}
              </Button>
            ))}
          </Group>
        </Scroller>
        <Center mt={"md"}>
          <Text size="sm"> or add a new item/band/act: </Text>
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
      </Container>
      <SimpleGrid cols={2} px="xl">
        <Stack>
          <Title order={3}>Lyrics</Title>
          <Box>
            {lyricInputMode == "raw" && (
              <Button size="xs" color="green" onClick={() => onFinishAddingLyrics()}>
                {" "}
                Finish adding
              </Button>
            )}
            {lyricInputMode == "rich" && (
              <Button size="xs" variant="outline" onClick={() => onBeginAddingLyrics()}>
                {" "}
                Add lyrics{" "}
              </Button>
            )}
          </Box>
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
            />
          )}

          {lyricInputMode === "rich" && <RichContent />}
        </Stack>
        <Stack>
          {cueOrder.map((cueId, index) => {
            let cue = cues.find((c) => c.id === cueId);
            if (!cue) return null;
            return <CueCard key={cue.id} cue={cue} cueNumber={index + 1} />;
          })}
        </Stack>
      </SimpleGrid>
    </Collapse>
  );
};
