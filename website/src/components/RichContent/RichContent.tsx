import { Group, Flex, Box, Text, Stack, Center } from "@mantine/core";
import { useAppContext } from "../../context/AppContext";
import classes from "./RichContext.module.css";
import clsx from "clsx";

export const RichContent = () => {
  const { content, setContent, onAddCue } = useAppContext();

  const getDisplayDiv = (word: string, index1: number, index2: number, cueCount: [number]) => {
    if (word.startsWith("<cueId=")) {
      cueCount[0]++;
      if (word.endsWith("=cueId>")) {
        // then we know it's a cue standing by itself (not attached to a word)

        return (
          <Center
            style={{
              paddingLeft: "0.5rem",
              paddingRight: "0.5rem",
              height: "stretch",
              backgroundColor: "yellow",
              border: "4px solid yellow",
            }}
          >
            Cue {cueCount[0]}
          </Center>
        );
      }
      const textContent = word.replace(/\<cueId=.*=cueId\>/gm, "");

      console.log({ textContent });
      // return <Box style={{ backgroundColor: "yellow" }}>{textContent}</Box>;
      return (
        <Group gap={0}>
          <Text variant="lyric" className={clsx(classes["lyric"], classes["in-cue"])}>
            {textContent}
          </Text>
          <Box className={classes["cue"]}>
            <Text>Cue {cueCount[0]}</Text>
          </Box>
        </Group>
      );
    } else {
      if (word === " ") {
        return (
          <Box
            className={classes["space"]}
            style={{ width: "calc(1rem / 2)", height: "stretch" }}
            onClick={() => onAddCue(index1, index2, true)}
          >
            ㅤ
          </Box>
        );
      }

      return (
        <Text variant="lyric" className={classes["lyric"]} onClick={() => onAddCue(index1, index2, false)}>
          {/* {word.length === 0 ? "ㅤ" : word} */}
          {word}
        </Text>
      );
    }
  };

  return (
    <Stack gap={0}>
      {(() => {
        const cueCount: [number] = [0];
        return content.map((line, index1) => (
          <Group key={index1} gap="0px">
            {line.map((word, index2) => (
              <Flex key={index2} style={{ flexDirection: "row" }}>
                {getDisplayDiv(word, index1, index2, cueCount)}
              </Flex>
            ))}
          </Group>
        ));
      })()}
    </Stack>
  );
};
