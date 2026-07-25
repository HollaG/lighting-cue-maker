import React from "react";
import { Group, Box, Text, Center } from "@mantine/core";
import clsx from "clsx";
import classes from "./RichWord.module.css";
import { convertUuidForDatabase } from "../../utils/convertUuid";
import { useAppStore } from "../../store/appStore";
import { InputModes, type InputMode } from "../../store/slices/lyricsSlice";
import { useGetEvent } from "../../query/useGetEvent";
import { useGetItem } from "../../query/useGetItem";

interface RichWordProps {
  word: string;
  index1: number;
  index2: number;
  order: {
    cue: number;
    bump: number;
  };
  isSelected?: boolean;
}

const richIdentifiers: InputMode[] = ["cue", "bump"];

const RichWordInternal = ({ word, index1, index2, order, isSelected }: RichWordProps) => {
  const inputMode = useAppStore((s) => s.inputMode);
  const activeItemId = useAppStore((s) => s.activeItemId);
  const code = useAppStore((s) => s.code);
  const { event } = useGetEvent({ code });
  const { item } = useGetItem({ itemId: activeItemId });
  if (word === "-") return <Text variant="lyric">{word}</Text>;

  // Check to see if it's
  for (const idType of richIdentifiers) {
    if (word.startsWith(`<${idType}Id=`)) {
      // stand-alone
      if (word.endsWith(`=${idType}Id>`)) {
        // e.g. <cueId=xyz=cudId>
        const id = convertUuidForDatabase(word.split(`<${idType}Id=`)[1].split(`=${idType}Id>`)[0]);

        let bumpConfigurationName = "";
        if (idType === "bump") {
          const bumpAssignment = item.bumps?.find((b) => b.id === id);
          if (bumpAssignment) {
            const bumpConfig = event?.bumpConfigurations?.find((b) => b.id === bumpAssignment.bumpConfigurationId);
            bumpConfigurationName = bumpConfig?.name || "";
          }
        }
        return (
          <Center
            id={`ref-${id}`}
            data-action={`select-${idType}`}
            {...{ [`data-${idType}-id`]: id, [`data-bump-name`]: bumpConfigurationName || undefined }}
            className={clsx(
              classes["richContainer"],
              classes[`is-${idType}`],
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
            {/* TODO: write a function to name this */}
            {/* {idType} {order[idType]} */}
            {getDisplayText(idType, order[idType], bumpConfigurationName)}
          </Center>
        );
      }

      // e.g. <cueId=xyz=cueId>hello
      const regex = new RegExp(`<${idType}Id=(.*?)=${idType}Id>`);
      const match = word.match(regex);
      const id = convertUuidForDatabase(match?.[1] || "");
      const textContent = word.replace(regex, "");

      let bumpConfigurationName = "";
      if (idType === "bump") {
        const bumpAssignment = item?.bumps?.find((b) => b.id === id);
        if (bumpAssignment) {
          const bumpConfig = event?.bumpConfigurations?.find((b) => b.id === bumpAssignment.bumpConfigurationId);
          bumpConfigurationName = bumpConfig?.name || "";
        }
      }

      return (
        <Group
          id={`ref-${id}`}
          data-action={`select-${idType}`}
          {...{ [`data-${idType}-id`]: id, [`data-bump-name`]: bumpConfigurationName || undefined }}
          gap={0}
          className={clsx(classes["richContainer"], classes[`is-${idType}`], isSelected ? classes["selected"] : "")}
        >
          <Text variant="lyric" className={clsx(classes["lyric"])}>
            {textContent}
          </Text>
          <Box className={classes["indicator"]}>
            <Text>{getDisplayText(idType, order[idType], bumpConfigurationName)}</Text>
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

      // return (
      //   <Text
      //     data-action="add"
      //     data-line-index={index1}
      //     data-word-index={index2}
      //     data-is-space="false"
      //     variant="lyric"
      //     className={clsx(classes["lyric"], classes[`mode-${inputMode}`])}
      //   >
      //     {word}
      //   </Text>
      // );
    }
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
};

/*
// Legacy implementation (cueId only, before loop over richIdentifiers):
const RichWordInternalLegacy = ({ word, index1, index2, cueNumber, isSelected }: RichWordProps) => {
  if (word === "-") return <Text variant="lyric">{word}</Text>;
  if (word.startsWith("<cueId=")) {
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
*/

export const RichWord = React.memo(RichWordInternal, (prevProps, nextProps) => {
  return (
    prevProps.word === nextProps.word &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.order.cue === nextProps.order.cue &&
    prevProps.order.bump === nextProps.order.bump
  );
});

const getDisplayText = (inputMode: InputMode, number: number, bumpConfigurationName: string | undefined) => {
  if (inputMode === "bump") {
    if (bumpConfigurationName) {
      return bumpConfigurationName;
    }
    return "Bump";
  }

  if (inputMode === "cue") {
    return `Cue ${number}`;
  }
};
