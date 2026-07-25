import React from "react";
import { Group, Box, Text, Center } from "@mantine/core";
import clsx from "clsx";
import classes from "./RichWord.module.css";
import { convertUuidForDatabase } from "../../utils/convertUuid";
import { useAppStore } from "../../store/appStore";

interface RichWordProps {
  word: string;
  index1: number;
  index2: number;
  cueNumber?: number;
  isSelected?: boolean;
}

const RichWordInternal = ({ word, index1, index2, cueNumber, isSelected }: RichWordProps) => {
  const inputMode = useAppStore((s) => s.inputMode);
  console.log(inputMode);
  if (word === "-") return <Text variant="lyric">{word}</Text>;
  if (word.startsWith("<cueId=")) {
    // stand-alone
    if (word.endsWith("=cueId>")) {
      const cueId = convertUuidForDatabase(word.split("<cueId=")[1].split("=cueId>")[0]);
      return (
        <Center
          id={`ref-${cueId}`}
          data-action="select-cue"
          data-cue-id={cueId}
          className={clsx(
            classes["richContainer"],
            classes["is-cue"],
            classes["indicator"],
            isSelected ? classes["selected"] : "",
          )}

          // style={{
          //   paddingLeft: "0.5rem",
          //   paddingRight: "0.5rem",
          //   height: "stretch",
          //   backgroundColor: "yellow",
          //   border: "4px solid yellow",
          //   cursor: "pointer",
          // }}
          // className={clsx(classes["cue"], classes["cue-wrapper"], isSelected ? classes["cue-selected"] : "")}
        >
          Cue {cueNumber}
        </Center>
      );
    }

    const textContent = word.replace(/<cueId=.*=cueId>/g, "");
    const cueId = convertUuidForDatabase(word.match(/<cueId=(.*?)=cueId>/)?.[1] || "");

    return (
      <Group
        id={`ref-${cueId}`}
        data-action="select-cue"
        data-cue-id={cueId}
        gap={0}
        className={clsx(classes["richContainer"], classes["is-cue"], isSelected ? classes["selected"] : "")}
      >
        <Text variant="lyric" className={clsx(classes["lyric"])}>
          {textContent}
        </Text>
        <Box className={classes["indicator"]}>
          <Text>Cue {cueNumber}</Text>
        </Box>
      </Group>
    );
  } else {
    if (word === " ") {
      return (
        <Box
          data-action="add"
          data-line-index={index1}
          data-word-index={index2}
          data-is-space="true"
          className={clsx(classes["space"], classes[`mode-${inputMode}`])}
        >
          ㅤ
        </Box>
      );
    }

    return (
      <Text
        data-action="add"
        data-line-index={index1}
        data-word-index={index2}
        data-is-space="false"
        variant="lyric"
        className={clsx(classes["lyric"], classes[`mode-${inputMode}`])}
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
