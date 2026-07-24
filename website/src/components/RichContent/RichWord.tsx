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
}

const RichWordInternal = ({ word, index1, index2, cueNumber, isSelected }: RichWordProps) => {
  console.log("word rendering");
  if (word.startsWith("<cueId=")) {
    if (word.endsWith("=cueId>")) {
      const cueId = convertUuidForDatabase(word.split("<cueId=")[1].split("=cueId>")[0]);
      return (
        <Center
          id={`ref-${cueId}`}
          data-action="select-cue"
          data-cue-id={cueId}
          style={{
            paddingLeft: "0.5rem",
            paddingRight: "0.5rem",
            height: "stretch",
            backgroundColor: "yellow",
            border: "4px solid yellow",
            cursor: "pointer",
          }}
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
        data-action="select-cue"
        data-cue-id={cueId}
        gap={0}
        style={{ cursor: "pointer" }}
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
          data-action="add-cue"
          data-line-index={index1}
          data-word-index={index2}
          data-is-space="true"
          className={classes["space"]}
          style={{ width: "calc(1rem / 2)", height: "stretch" }}
        >
          ㅤ
        </Box>
      );
    }

    return (
      <Text
        data-action="add-cue"
        data-line-index={index1}
        data-word-index={index2}
        data-is-space="false"
        variant="lyric"
        className={classes["lyric"]}
      >
        {word}
      </Text>
    );
  }
};

export const RichWord = React.memo(RichWordInternal, (prevProps, nextProps) => {
  return (
    prevProps.word === nextProps.word &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.cueNumber === nextProps.cueNumber
  );
});
