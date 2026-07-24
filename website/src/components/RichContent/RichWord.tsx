import React from "react";
import { Group, Box, Text, Center } from "@mantine/core";
import clsx from "clsx";
import classes from "./RichWord.module.css";
import { convertUuidForDatabase } from "../../utils/convertUuid";

interface RichWordProps {
  word: string;
  index1: number;
  index2: number;
  cueNumber?: number;
  isSelected?: boolean;
  onSelectCue: (cueId: string) => void;
  onAddCue: (lineIndex: number, wordIndex: number, isSpace: boolean) => void;
}

const RichWordInternal = ({ word, index1, index2, cueNumber, isSelected, onSelectCue, onAddCue }: RichWordProps) => {
  console.log("word rendering");
  if (word.startsWith("<cueId=")) {
    if (word.endsWith("=cueId>")) {
      const cueId = convertUuidForDatabase(word.split("<cueId=")[1].split("=cueId>")[0]);
      return (
        <Center
          id={`ref-${cueId}`}
          style={{
            paddingLeft: "0.5rem",
            paddingRight: "0.5rem",
            height: "stretch",
            backgroundColor: "yellow",
            border: "4px solid yellow",
            cursor: "pointer",
          }}
          onClick={() => onSelectCue(cueId)}
          className={clsx(classes["cue-wrapper"], isSelected ? classes["cue-selected"] : "")}
        >
          Cue {cueNumber}
        </Center>
      );
    }

    const textContent = word.replace(/\<cueId=.*=cueId\>/gm, "");
    const cueId = convertUuidForDatabase(word.match(/<cueId=(.*?)=cueId>/)?.[1] || "");

    return (
      <Group
        id={`ref-${cueId}`}
        gap={0}
        style={{ cursor: "pointer" }}
        onClick={() => onSelectCue(cueId)}
        className={clsx(classes["cue-wrapper"], isSelected ? classes["cue-selected"] : "")}
      >
        <Text variant="lyric" className={clsx(classes["lyric"], classes["in-cue"])}>
          {textContent}
        </Text>
        <Box className={classes["cue"]}>
          <Text>Cue {cueNumber}</Text>
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
        {word}
      </Text>
    );
  }
};

export const RichWord = React.memo(RichWordInternal, (prevProps, nextProps) => {
  // rerender only if word and isSelected changes and cueNumber (changing cue number needs to update the component)
  return (
    prevProps.word === nextProps.word &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.cueNumber === nextProps.cueNumber
  );
});
