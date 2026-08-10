import { Flex, Group, SegmentedControl, Stack, Text } from "@mantine/core";
import { useState, type MouseEvent } from "react";
import { insertBumpInRichContent } from "../../utils/bumpUtils";
import { generateRich } from "../../utils/convertText";
import { insertCueInRichContent } from "../../utils/cueUtils";
import { RichWord } from "./RichWord";

type DemoMarkerMode = "cue" | "bump";

export type RichContentDemoProps = {
  initialRawLyrics: string;
};

/**
 * Local-only version of RichContent for demonstrating cue and bump placement.
 * It deliberately avoids app state, API queries, mutations, items, and events.
 */
export const RichContentDemo = ({ initialRawLyrics }: RichContentDemoProps) => {
  const [content, setContent] = useState(() => generateRich(initialRawLyrics));
  const [mode, setMode] = useState<DemoMarkerMode>("cue");

  const handleContentClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action="add"]');
    if (!target) return;

    const lineIndex = Number(target.dataset.lineIndex);
    const wordIndex = Number(target.dataset.wordIndex);
    const isSpace = target.dataset.isSpace === "true";
    const markerId = crypto.randomUUID();

    setContent((currentContent) =>
      mode === "cue"
        ? insertCueInRichContent(markerId, lineIndex, wordIndex, isSpace, currentContent)
        : insertBumpInRichContent(markerId, lineIndex, wordIndex, isSpace, currentContent),
    );
  };

  return (
    <Stack gap="sm">
      <Group gap="sm">
        <Text size="sm" fw={600}>
          Add a marker:
        </Text>
        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as DemoMarkerMode)}
          data={[
            { label: "Cue", value: "cue" },
            { label: "Bump", value: "bump" },
          ]}
        />
      </Group>

      <Stack gap={0} onClick={handleContentClick}>
        {(() => {
          let cueCount = 0;
          let bumpCount = 0;

          return content.map((line, lineIndex) => (
            <Group key={lineIndex} gap={0} align="end">
              {line.map((word, wordIndex) => {
                if (word.startsWith("{cueId=") || word.startsWith("<cueId=")) cueCount++;
                if (word.startsWith("{bumpId=") || word.startsWith("<bumpId=")) bumpCount++;

                return (
                  <Flex key={wordIndex}>
                    <RichWord
                      word={word}
                      index1={lineIndex}
                      index2={wordIndex}
                      order={{ cue: cueCount, bump: bumpCount }}
                      inputMode={mode}
                    />
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
