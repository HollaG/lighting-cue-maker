import { Stack, Flex, Alert, Code, Kbd, Textarea, Group } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
// import { ContentControl } from "../ContentControl/ContentControl";
import { RichContentWrapper } from "../RichContent-v2/RichContentWrapper";
import { useAppStore, type InputMode } from "../../store/appStore";
import { /* useCallback, */ useEffect, /* useMemo, */ useRef, useState } from "react";
import { useGetItem } from "../../query-v2/items/useGetItem";
import { useUpsertItem } from "../../query-v2/items/useUpsertItem";
import { sanitize } from "../../utils/sanitize";
import { useDebouncedCallback, useHotkeys, type HotkeyItem } from "@mantine/hooks";
import { ContentControlFixed } from "../ContentControl/ContentControlFixed";

export const Lyrics = ({ eventId, itemId }: { itemId: string; eventId: string }) => {
  const { item } = useGetItem(eventId, itemId);
  const { mutateAsync: updateItem } = useUpsertItem(eventId);

  const inputMode = useAppStore((s) => s.inputMode);
  const setInputMode = useAppStore((s) => s.setInputMode);

  const inputTimingMode = useAppStore((s) => s.inputTimingMode);

  const instantBumpMode = useAppStore((s) => s.instantAddBumpMode);
  const setDerivedLyrics = useAppStore((s) => s.setDerivedLyrics);

  const [internalRawLyrics, setInternalRawLyrics] = useState<string>("");

  const setIndicatorNumber = useAppStore((s) => s.setIndicatorNumber);

  // const showCueIdentifiers = useAppStore((s) => s.showCueIdentifiers);
  // const toggleShowCueIdentifiers = useAppStore((s) => s.toggleShowCueIdentifiers);

  const contentRef = useRef<HTMLDivElement>(null);

  // Hotkeys for timing indicators
  useHotkeys([1, 2, 3, 4, 5, 6, 7, 8].map((i): HotkeyItem => [i.toString(), () => setIndicatorNumber(i)]));

  // --- Autosave of the lyrics textarea ---------
  // Every text this editor has sent for the current item. When the server's copy changes to one of these, it is just
  // our own save coming back: the textarea may already hold newer typing, so it must not be overwritten.
  const sentLyricsRef = useRef(new Set<string>());

  // The item id is passed in (not read from props when the timer fires), so a save still pending when the user
  // switches item goes to the item it was typed in.
  const saveLyrics = useDebouncedCallback(
    (id: string, rawLyrics: string) => {
      sentLyricsRef.current.add(rawLyrics);
      void updateItem({ id, rawLyrics }).catch(console.error);
    },
    { delay: 600, flushOnUnmount: true }, // leaving the page mid-typing still saves
  );

  const onChangeLyrics = (rawLyrics: string) => {
    setInternalRawLyrics(rawLyrics);
    saveLyrics(itemId, rawLyrics);
  };

  // Switching item: send the previous item's pending text now, and forget what was sent for it.
  useEffect(
    () => () => {
      saveLyrics.flush();
      sentLyricsRef.current.clear();
    },
    [itemId], // eslint-disable-line react-hooks/exhaustive-deps -- saveLyrics always calls the latest callback
  );

  useEffect(() => {
    const lyrics = item?.rawLyrics ?? "";
    setDerivedLyrics(sanitize(lyrics));
    if (sentLyricsRef.current.has(lyrics)) return; // our own save coming back
    setInternalRawLyrics(sanitize(lyrics));
  }, [item?.rawLyrics, setDerivedLyrics]);

  const onFinishAddingLyrics = (switchTo: InputMode) => {
    // Edits are already autosaved; just make sure the last few keystrokes go out before the mode changes.
    saveLyrics.flush();
    setInputMode(switchTo);
  };

  const deleteExtraSpaces = () => {
    onChangeLyrics(internalRawLyrics.replaceAll("\n\n\n", "\n\n"));
  };

  useEffect(() => {
    if (item?.rawLyrics === "") {
      setInputMode("raw");
    }
  }, [item?.rawLyrics, setInputMode]);

  return (
    <Stack>
      <Group>
        <Flex flex={1}>
          <ContentControlFixed
            eventId={eventId}
            deleteExtraSpaces={deleteExtraSpaces}
            onFinishAddingLyrics={onFinishAddingLyrics}
            showTitle
          />
        </Flex>
      </Group>
      <Alert
        variant="light"
        color="lime"
        icon={<IconInfoCircle />}
        style={{
          transition: "all 0.3s ease",
        }}
      >
        {inputMode === "raw" ? (
          <Stack gap={"xs"}>
            <span>
              You can add any lyrics / spoken word during your set here. Once done, change to <Code>Cue mode</Code> to
              start adding cues.
            </span>
            <span>
              Do not modify or delete the embedded cue data! (<Code>{`{cueId=...=cueId}`}</Code>)
            </span>
            <span>Tip: use a hyphen (-) if you need to separate syllables.</span>
          </Stack>
        ) : (
          ""
        )}

        {inputMode === "cue" ? (
          <Stack gap="xs">
            <span>Click on any word or space to add a cue at that point.</span>
            <span>
              Tip: need to put a cue on a syllable? Use a hyphen (-) in <Code>Edit lyrics</Code> mode to separate the
              syllables.
            </span>
          </Stack>
        ) : (
          <></>
        )}

        {inputMode === "bump" ? (
          <Stack gap="xs">
            <span>
              Click on any word or space to add a bump for <Code>{instantBumpMode?.name}</Code> at that point. A bump is
              an instantaneous effect that will flash only at the point you specify.
            </span>
            Click again to remove.
          </Stack>
        ) : (
          <></>
        )}

        {inputMode === "timing" ? (
          <Stack gap="xs">
            <span>
              {" "}
              First, set the beat number you want to add by pressing <Kbd>1</Kbd> ... <Kbd>8</Kbd> on your keyboard, or
              use the "Beat to add" input.
            </span>
            <span>
              {" "}
              Then, click on any word or space to indicate the <Code>{inputTimingMode} beat</Code>.
            </span>
          </Stack>
        ) : (
          <></>
        )}
      </Alert>
      {inputMode === "raw" && (
        <Textarea
          variant="unstyled"
          autosize
          // className={classes["lyric-input"]}
          value={internalRawLyrics}
          onChange={(e) => onChangeLyrics(e.target.value)}
          onBlur={() => saveLyrics.flush()} // save right away when the field loses focus
          placeholder="Paste all your lyrics here! You can also include band introductions or other improv stuff."
          styles={{
            input: { fontSize: "16px" }, // Or use rem units like '1.25rem'
          }}
          minRows={14}
        />
      )}

      {(inputMode === "cue" || inputMode === "bump" || inputMode === "timing") && (
        <div ref={contentRef} id="focus-trap-lyrics" tabIndex={-1} style={{ outline: "none" }}>
          <RichContentWrapper itemId={itemId} eventId={eventId} />
        </div>
      )}
    </Stack>
  );
};
