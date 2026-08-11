import { ActionIcon, Box, Flex, Group, Select, Transition } from "@mantine/core";
import { useAppStore, type InputMode } from "../../store/appStore";
import { ContentControlFixed } from "./ContentControlFixed";
import { useState } from "react";
import { useInViewport } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight, IconPin, IconPinnedOff } from "@tabler/icons-react";

export const ContentControl = ({
  eventId,
  deleteExtraSpaces,
  onFinishAddingLyrics,
  showCues,
}: {
  showCues: boolean;
  eventId: string;
  deleteExtraSpaces: () => void;
  onFinishAddingLyrics: (switchTo: InputMode) => void;
}) => {
  const { ref: defaultControlRef, inViewport } = useInViewport();
  const cueOrder = useAppStore((s) => s.cueOrder);
  const setCurrentlySelectedCueId = useAppStore((s) => s.setCurrentlySelectedCueId);
  const currentlySelectedCueId = useAppStore((s) => s.currentlySelectedCueId);

  const bumpOrder = useAppStore((s) => s.bumpOrder);
  const setCurrentlySelectedBumpId = useAppStore((s) => s.setCurrentlySelectedBumpId);
  const currentlySelectedBumpId = useAppStore((s) => s.currentlySelectedBumpId);

  const inputMode = useAppStore((s) => s.inputMode);

  const [alwaysShow, setAlwaysShow] = useState(false);

  const scrollToElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 128;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const onSelectCue = (cueId: string | null) => {
    if (!cueId) return;
    scrollToElement(`ref-${cueId}`);
    setCurrentlySelectedCueId(cueId);
    setAlwaysShow(true);
  };

  const onCueNext = () => {
    if (!currentlySelectedCueId) return;
    const index = cueOrder.indexOf(currentlySelectedCueId);
    const newIndex = index === cueOrder.length - 1 ? 0 : index + 1;
    setCurrentlySelectedCueId(cueOrder[newIndex]);
    onSelectCue(cueOrder[newIndex]);
    setAlwaysShow(true);
  };

  const onCuePrevious = () => {
    if (!currentlySelectedCueId) return;
    const index = cueOrder.indexOf(currentlySelectedCueId);
    const newIndex = index === 0 ? cueOrder.length - 1 : index - 1;
    setCurrentlySelectedCueId(cueOrder[newIndex]);
    onSelectCue(cueOrder[newIndex]);
    setAlwaysShow(true);
  };

  const onSelectBump = (bumpId: string | null) => {
    if (!bumpId) return;
    scrollToElement(`ref-${bumpId}`);
    setCurrentlySelectedBumpId(bumpId);
    setAlwaysShow(true);
  };

  const onBumpNext = () => {
    if (!currentlySelectedBumpId) return;
    const index = bumpOrder.indexOf(currentlySelectedBumpId);
    const newIndex = index === bumpOrder.length - 1 ? 0 : index + 1;
    setCurrentlySelectedBumpId(bumpOrder[newIndex]);
    onSelectBump(bumpOrder[newIndex]);
    setAlwaysShow(true);
  };

  const onBumpPrevious = () => {
    if (!currentlySelectedBumpId) return;
    const index = bumpOrder.indexOf(currentlySelectedBumpId);
    const newIndex = index === 0 ? bumpOrder.length - 1 : index - 1;
    setCurrentlySelectedBumpId(bumpOrder[newIndex]);
    onSelectBump(bumpOrder[newIndex]);
    setAlwaysShow(true);
  };

  return (
    <Box style={{ width: "100%" }}>
      <Box ref={defaultControlRef}>
        <ContentControlFixed
          eventId={eventId}
          deleteExtraSpaces={deleteExtraSpaces}
          onFinishAddingLyrics={onFinishAddingLyrics}
          showTitle
        />
      </Box>

      <Transition
        mounted={(!inViewport || alwaysShow) && showCues}
        transition="fade-up"
        duration={250}
        timingFunction="ease-in-out"
      >
        {(styles) => (
          <Box
            pos="fixed"
            bottom={"32px"}
            right={showCues ? "55%" : "64px"}
            style={{
              ...styles,
              width: showCues ? "40%" : "calc(100% - 128px)",
              marginLeft: "auto",
              marginRight: "auto",
              backgroundColor: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
              borderRadius: "1rem",
              border: "1px solid light-dark(var(--mantine-color-lime-3), var(--mantine-color-dark-4))",
              padding: "1rem",
              zIndex: 99,
            }}
          >
            <Group gap="xs">
              {inputMode === "cue" ? (
                <Group gap="xs">
                  <ActionIcon variant="light" color="lime" size={"lg"} onClick={onCuePrevious}>
                    <IconChevronLeft width={"1.25rem"} />
                  </ActionIcon>
                  <Box w={"130px"}>
                    <Select
                      allowDeselect={false}
                      value={currentlySelectedCueId}
                      onChange={(value) => {
                        setCurrentlySelectedCueId(value ?? "");
                        onSelectCue(value);
                      }}
                      data={cueOrder.map((cueId, index) => ({
                        value: cueId,
                        label: `Cue ${index + 1}`,
                      }))}
                      size="sm"
                      placeholder="Select cue"
                    />
                  </Box>
                  <ActionIcon variant="light" color="lime" size="lg" onClick={onCueNext}>
                    <IconChevronRight width={"1.25rem"} />
                  </ActionIcon>
                </Group>
              ) : inputMode === "bump" ? (
                <Group gap="xs">
                  <ActionIcon variant="light" color="lime" size={"xl"} onClick={onBumpPrevious}>
                    <IconChevronLeft width={"1.25rem"} />
                  </ActionIcon>
                  <Box w={"130px"}>
                    <Select
                      allowDeselect={false}
                      value={currentlySelectedBumpId}
                      onChange={(value) => {
                        setCurrentlySelectedBumpId(value ?? "");
                        onSelectBump(value);
                      }}
                      data={bumpOrder.map((bumpId, index) => ({
                        value: bumpId,
                        label: `Bump ${index + 1}`,
                      }))}
                      placeholder="Select bump"
                      size="xs"
                    />
                  </Box>
                  <ActionIcon variant="light" color="lime" size="lg" onClick={onBumpNext}>
                    <IconChevronRight width={"1.25rem"} />
                  </ActionIcon>
                </Group>
              ) : (
                <></>
              )}

              <Flex flex={1}></Flex>
              <ContentControlFixed
                eventId={eventId}
                deleteExtraSpaces={deleteExtraSpaces}
                onFinishAddingLyrics={onFinishAddingLyrics}
                showTitle={false}
              />
              <ActionIcon ml="xs" size="md" variant="transparent" onClick={() => setAlwaysShow(!alwaysShow)}>
                {alwaysShow ? <IconPinnedOff width={"2rem"} /> : <IconPin width={"2rem"} />}
              </ActionIcon>
            </Group>
          </Box>
        )}
      </Transition>
    </Box>
  );
};
