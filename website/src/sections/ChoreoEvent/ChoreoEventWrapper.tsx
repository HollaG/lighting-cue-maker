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
import { useCallback, useMemo, useState } from "react";
import { useRequest } from "../../hooks/useRequest";
import { useFetch } from "../../hooks/useFetch";
import type { Item } from "../../types/types";
import { generateRich } from "../../utils/generateRich";

import classes from "./ChoreoEventWrapper.module.css";

generateRich("l")

type LyricMode = "raw" | "rich"
export const ChoreoEventWrapper = () => {
  const { isValidEvent, event, setActiveItem, activeItem } = useAppContext();


  const [itemName, setItemName] = useState("");
  const [lyricInputMode, setLyricInputMode] = useState<LyricMode>("raw")
  const [rawLyric, setRawLyrics] = useState<string>("")
  console.log({ rawLyric })

  const { executeRequest: createItem } = useRequest<{ name: string }, { item: Item }>(`/api/v1/events/${event?.id}/items`, "POST");
  const { data, refetch } = useFetch<{ items: Item[] }>(`/api/v1/events/${event?.id}/items`, isValidEvent);



  const items = data?.items || [];

  console.log({ items })
  const onAddItem = async () => {
    const res = await createItem({ name: itemName });
    if (res?.item) {
      setActiveItem(res.item)
    }
    refetch();
  };

  const contentArray = useMemo(() => {
    if (lyricInputMode === "raw") return []

    return generateRich(rawLyric)
  }, [rawLyric, lyricInputMode])

  console.log({ contentArray })

  return (
    <Collapse expanded={isValidEvent}>
      <Container size={"xl"}>
        <Divider my="lg" label="create your lighting plan" labelPosition="center" />
        <Scroller>
          <Group gap={"xs"} wrap="nowrap">
            {items.map((b) => (
              <Button key={b.id} size="xs" variant={activeItem?.id === b.id ? "filled" : 'outline'} color={activeItem?.id === b.id ? "blue" : "gray"} onClick={() => setActiveItem(b)}>
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

            {lyricInputMode == "raw" && <Button size="xs" color="green" onClick={() => setLyricInputMode("rich")}> Finish adding</Button>}
            {lyricInputMode == "rich" && <Button size="xs" variant="outline" onClick={() => setLyricInputMode("raw")}> Add lyrics </Button>}
          </Box>
          {lyricInputMode === "raw" && <Textarea
            variant="unstyled"
            autosize
            className={classes['lyric-input']}
            value={rawLyric}
            onChange={(e) => setRawLyrics(e.target.value)}
            placeholder="Paste all your lyrics here! You can also include band introductions or other improv stuff."
            styles={{
              input: { fontSize: '16px' }, // Or use rem units like '1.25rem'
            }}
          />}
          {lyricInputMode === "rich" && <Stack gap={0}>
            {contentArray.map((line, index1) => (
              <Group key={index1} gap="0px">
                {line.map((word, index2) => (
                  <Flex key={index2} style={{ flexDirection: 'row' }}>
                    <Text className={classes['lyric']}>{word.length === 0 ? "ㅤ" : word}</Text>
                    {index2 !== line.length - 1 ? <Box className={classes["space"]} style={{ width: "calc(1rem / 2)", height: 'stretch' }}></Box> : null}
                  </Flex>
                ))}
              </Group>
            ))}
          </Stack>
          }
        </Stack>
        <Stack>

        </Stack>
      </SimpleGrid>
    </Collapse>
  );
};
