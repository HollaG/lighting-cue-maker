import { Flex, Group, Stack, Text } from "@mantine/core";
import { useState, type MouseEvent } from "react";
import { generateRich } from "../../utils/convertText";
import { insertCueInRichContent } from "../../utils/cue/cueForm";
import { RichWord } from "./RichWord";

export type RichContentDemoProps = {
  initialRawLyrics: string;
};

/**
 * Local-only version of RichContent for demonstrating cue placement.
 * It deliberately avoids app state, API queries, mutations, items, and events.
 */
export const RichContentDemo = ({ initialRawLyrics }: RichContentDemoProps) => {
  const [content, setContent] = useState(() => generateRich(initialRawLyrics));

  const handleContentClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action="add"]');
    if (!target) return;

    const lineIndex = Number(target.dataset.lineIndex);
    const wordIndex = Number(target.dataset.wordIndex);
    const isSpace = target.dataset.isSpace === "true";
    const markerId = crypto.randomUUID();

    setContent((currentContent) => insertCueInRichContent(markerId, lineIndex, wordIndex, isSpace, currentContent));
  };

  return (
    <Stack gap="sm">
      <Text size="sm" fw={600}>
        Click a word or space to add a cue:
      </Text>

      <Stack gap={0} onClick={handleContentClick}>
        {(() => {
          let cueCount = 0;

          return content.map((line, lineIndex) => (
            <Group key={lineIndex} gap={0} align="end">
              {line.map((word, wordIndex) => {
                if (word.startsWith("{cueId=") || word.startsWith("<cueId=")) cueCount++;

                return (
                  <Flex key={wordIndex}>
                    <RichWord word={word} index1={lineIndex} index2={wordIndex} cueNumber={cueCount} inputMode="cue" />
                  </Flex>
                );
              })}
            </Group>
          ));
        })()}
      </Stack>
    </Stack>
  );
};
