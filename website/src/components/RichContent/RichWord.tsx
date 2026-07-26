import React from "react";
import { Box, Text, Center, Group } from "@mantine/core";
import clsx from "clsx";
import classes from "./RichWord.module.css";
import { convertUuidForDatabase } from "../../utils/convertUuid";
import { type InputMode } from "../../store/slices/lyricsSlice";

interface RichWordProps {
  word: string;
  index1: number;
  index2: number;
  order: {
    cue: number;
    bump: number;
  };
  isSelected?: boolean;
  inputMode: InputMode;
  bumpNameMap?: Record<string, string>;
}

const richIdentifiers = ["cue", "bump"] as const;

const BOTTOM_GAP = "4px";

const RichWordInternal = ({
  word,
  index1,
  index2,
  order,
  isSelected,
  inputMode,
  bumpNameMap,
}: RichWordProps) => {
  if (word === "-")
    return (
      <Text variant="lyric" style={{ marginBottom: BOTTOM_GAP }}>
        {word}
      </Text>
    );

  // Check to see if it's
  for (const idType of richIdentifiers) {
    const isTagStart = word.startsWith(`{${idType}Id=`) || word.startsWith(`<${idType}Id=`);
    if (isTagStart) {
      const isTagEnd = word.endsWith(`=${idType}Id}`) || word.endsWith(`=${idType}Id>`);
      // stand-alone
      if (isTagEnd) {
        // e.g. {cueId=xyz=cueId} or <cueId=xyz=cueId>
        const rawId = word.split(/[\{<]/)[1].split(`=${idType}Id`)[0].replace(`${idType}Id=`, "");
        const id = convertUuidForDatabase(rawId);

        const bumpConfigurationName = idType === "bump" ? bumpNameMap?.[id] || "" : "";
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
            dangerouslySetInnerHTML={{
              __html: `${getDisplayText(idType, order[idType], bumpConfigurationName) as string}`,
            }}
          ></Center>
        );
      }

      // e.g. {cueId=xyz=cueId}hello
      const regex = new RegExp(`[\\{<]${idType}Id=(.*?)=${idType}Id[\\}>]`);
      const match = word.match(regex);
      const id = convertUuidForDatabase(match?.[1] || "");
      const textContent = word.replace(regex, "");

      const bumpConfigurationName = idType === "bump" ? bumpNameMap?.[id] || "" : "";

      return (
        <Group
          id={`ref-${id}`}
          data-action={`select-${idType}`}
          {...{ [`data-${idType}-id`]: id, [`data-bump-name`]: bumpConfigurationName || undefined }}
          gap={0}
          className={clsx(classes["richContainer"], classes[`is-${idType}`], isSelected ? classes["selected"] : "")}
        >
          <Text
            variant="lyric"
            className={clsx(classes["lyric"])}
            dangerouslySetInnerHTML={{
              __html: textContent,
            }}
          ></Text>
          <Box className={classes["indicator"]}>
            <Text
              dangerouslySetInnerHTML={{
                __html: `${getDisplayText(idType, order[idType], bumpConfigurationName) as string}`,
              }}
            ></Text>
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
            style={{ marginBottom: BOTTOM_GAP }}
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
      style={{ marginBottom: BOTTOM_GAP }}
      dangerouslySetInnerHTML={{
        __html: word,
      }}
    >
      {/* {word} */}
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
    prevProps.inputMode === nextProps.inputMode &&
    prevProps.order.cue === nextProps.order.cue &&
    prevProps.order.bump === nextProps.order.bump &&
    prevProps.bumpNameMap === nextProps.bumpNameMap
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
    // return "ㅤ";
    return `#${number.toString().padStart(2, "0")}`;
  }
};
