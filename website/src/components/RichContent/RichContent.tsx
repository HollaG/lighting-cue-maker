import React, { useCallback } from "react";
import { Group, Flex, Stack } from "@mantine/core";
import { useAppStore } from "../../store/appStore";
import { convertUuidForDatabase } from "../../utils/convertUuid";
import { useGetItem } from "../../query/useGetItem";
import { useGetCues } from "../../query/useGetCues";
import { RichWord } from "./RichWord";

export const RichContent = ({ itemId }: { itemId: string }) => {
  const onAddCue = useAppStore((s) => s.onAddCue);
  const setCurrentlySelectedCueId = useAppStore((s) => s.setCurrentlySelectedCueId);
  const currentlySelectedCueId = useAppStore((s) => s.currentlySelectedCueId);

  const { content, refetchItem } = useGetItem({ itemId });
  const { refetchCues } = useGetCues({ itemId });

  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
      if (!target) return;

      const action = target.dataset.action;

      if (action === "select-cue") {
        const cueId = target.dataset.cueId;
        if (cueId) {
          setCurrentlySelectedCueId(currentlySelectedCueId === cueId ? undefined : cueId);
        }
      } else if (action === "add-cue") {
        const lineIndex = Number(target.dataset.lineIndex);
        const wordIndex = Number(target.dataset.wordIndex);
        const isSpace = target.dataset.isSpace === "true";

        onAddCue(lineIndex, wordIndex, isSpace, content, refetchItem, refetchCues);
      }
    },
    [currentlySelectedCueId, setCurrentlySelectedCueId, onAddCue, content, refetchItem, refetchCues],
  );

  return (
    <Stack gap={0} onClick={handleContainerClick} style={{ position: "relative" }}>
      {(() => {
        let cueCount = 0;
        return content.map((line, index1) => (
          <Group key={index1} gap="0px">
            {line.map((word, index2) => {
              let cueNumber: number | undefined = undefined;
              let cueId: string | undefined = undefined;

              if (word.startsWith("<cueId=")) {
                cueCount++;
                cueNumber = cueCount;
                if (word.endsWith("=cueId>")) {
                  cueId = convertUuidForDatabase(word.split("<cueId=")[1].split("=cueId>")[0]);
                } else {
                  cueId = convertUuidForDatabase(word.match(/<cueId=(.*?)=cueId>/)?.[1] || "");
                }
              }

              const isSelected = !!cueId && currentlySelectedCueId === cueId;

              return (
                <Flex key={index2} style={{ flexDirection: "row" }}>
                  <RichWord word={word} index1={index1} index2={index2} cueNumber={cueNumber} isSelected={isSelected} />
                </Flex>
              );
            })}
          </Group>
        ));
      })()}
    </Stack>
  );
};
