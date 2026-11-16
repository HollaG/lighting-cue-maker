import {
  Menu,
  Text,
  Box,
  Flex,
  SegmentedControl,
  Select,
  Group,
  Divider,
  Modal,
  getDefaultZIndex,
  Button,
  ActionIcon,
  Stack,
  Title,
  Switch,
} from "@mantine/core";
import { type Span, useItem, useTimelineContext } from "dnd-timeline";
import { useMemo, useState, type ReactNode } from "react";
import { useDisclosure, useMouse } from "@mantine/hooks";
import type { ItemData, TimelineRowId } from "../../utils/timeline";
import { ConfirmDelete } from "../ConfirmDeleteButton/ConfirmDeleteButton";
import {
  getSectionLengthMs,
  TimelineMarkerType,
  TimelineSectionType,
  type TimelineBeatSection,
  type TimelineMarker,
  type TimelineSection,
} from "../../types-v2/timeline";
import { CustomTextInput } from "../CustomTextInput/CustomTextInput";
import { DebouncedNumberInput } from "../Inputs/DebouncedNumberInput";
import {
  useUpsertTimelineSectionItem,
  type TimelineSectionPatch,
} from "../../query-v2/timeline/useUpsertTimelineSectionItem";
import { Logger } from "../../utils/logger";
import { useAppStore } from "../../store/appStore";
import { useGetItem } from "../../query-v2/items/useGetItem";
import { getCueOrder, getRichRangeBetweenCues, type RichRange } from "../../utils/cue/cueForm";
import { generateRich } from "../../utils/convertText";
import { RichContent } from "../RichContent-v2/RichContent";
import { sanitize } from "../../utils/sanitize";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { popTransition } from "../../utils/animations";
import { notifications } from "../../utils/notifications";

const COMMON_TIME_SIGNATURES = [
  { label: "4/4", value: "4/4" },
  { label: "3/4", value: "3/4" },
  { label: "6/8", value: "6/8" },
  { label: "5/4", value: "5/4" },
  { label: "7/8", value: "7/8" },
  { label: "9/8", value: "9/8" },
  { label: "12/8", value: "12/8" },
];

const SNAP_DIVISIONS = [
  { label: "Off", value: -1 },
  { label: "Bar", value: 0 },
  { label: "Beat", value: 1 },
  { label: "1/2", value: 2 },
  { label: "1/3", value: 3 },
  { label: "1/4", value: 4 },
  { label: "1/6", value: 6 },
  { label: "1/8", value: 8 },
];

export const TimelineSectionItem = ({
  eventId,
  itemId,
  id,
  rowId,
  span,
  section,
  sections,
  onDelete,
}: {
  eventId: string;
  itemId: string;
  id: string;
  rowId: TimelineRowId;
  span: Span;
  section: TimelineSection;
  sections: TimelineSection[]; // all sections, for finding the left/right cues
  onDelete: (id: string) => void;
}) => {
  const data: ItemData = { rowId };
  const { setNodeRef, attributes, listeners, itemStyle, itemContentStyle } = useItem({ id, span, data });

  const { upsertSection } = useUpsertTimelineSectionItem(eventId, itemId);

  const onValueChange = async (field: keyof TimelineSection, value: any) => {
    // Only this field: spreading `section` would send the copy from this render and undo edits made since.
    await upsertSection({ id: section.id, [field]: value } as TimelineSectionPatch);
  };

  return (
    <div
      ref={setNodeRef}
      style={itemStyle}
      {...listeners}
      {...attributes}
      onPointerDown={(event) => {
        if (event.button === 0) listeners?.onPointerDown?.(event);
      }}
    >
      <div
        style={{
          ...itemContentStyle,
          height: "100%",
          overflow: "hidden",
          borderRadius: "var(--mantine-radius-sm)",
          borderColor: "var(--mantine-primary-color-light)",
          borderWidth: 4,
          borderStyle: "solid",
          color: "var(--mantine-primary-color-light-color)",
          display: "flex",
          alignItems: "center",
          zIndex: 99,
        }}
      >
        <Menu shadow="md" position="top" withArrow withinPortal>
          <Menu.ContextMenu>
            <Box w="100%" style={{ overflow: "hidden" }} h="100%">
              <Flex
                h="100%"
                style={{
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                {/* Drag bar */}
                <Flex
                  style={{
                    height: "1.5rem",
                    backgroundColor: "var(--mantine-color-dark-5)",
                    cursor: "grab",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    fz="xs"
                    truncate="end"
                    miw={0}
                    style={{
                      color: "var(--mantine-color-dark-1)",
                    }}
                  >
                    Click and drag this bar to reposition. Right Click for more options
                  </Text>
                </Flex>
                {/* Main content */}
                <Flex flex={1} onPointerDown={(e) => e.stopPropagation()}>
                  {section.type === TimelineSectionType.BEAT && (
                    <TimelineBeatSectionItem eventId={eventId} itemId={itemId} section={section} sections={sections} />
                  )}
                </Flex>
                {/* controls and text */}
                <Flex
                  w="100%"
                  style={{
                    justifyContent: "space-between",
                    height: "48px",
                    borderColor: "var(--mantine-primary-color-light)",
                    borderStyle: "solid",
                    borderWidth: "4px 0 0 0", // top: the section's own border is already below
                    alignItems: "center",
                  }}
                  px="md"

                  onPointerDown={(e) => e.stopPropagation()} // controls bar: don't start a dnd-kit drag (it swallows clicks and clears the caret)
                >
                  <Box
                    style={{
                      // display: "grid",
                      // gridTemplateColumns: "1fr auto 1fr",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      width: "100%",
                      flex: 1,
                      gap: "var(--mantine-spacing-sm)",
                    }}
                  >
                    <Box>
                      <SegmentedControl
                        size="xs"
                        data={[
                          { label: "BPM", value: TimelineSectionType.BEAT },
                          { label: "Time", value: TimelineSectionType.TIME },
                        ]}
                        value={section.type}
                        onChange={(value) => onValueChange("type", value as TimelineSectionType)}
                      />
                    </Box>
                    <Box style={{ width: "15rem" }}>
                      <CustomTextInput value={section.name || "Untitled"} />
                    </Box>
                    <Flex flex={1} />
                    {section.type === "beat" && (
                      <Group justify="end" gap="sm">
                        <Text c="dimmed" size="sm">
                          Bars
                        </Text>
                        <Box style={{ width: "4rem" }}>
                          {/* (Beats) Bars (but actually convert to beats later) */}
                          <DebouncedNumberInput
                            size="xs"
                            placeholder="Bar count"
                            value={Math.round(section.beats / section.timeSigNum)}
                            min={1}
                            allowDecimal={false}
                            onSave={(bars) => void upsertSection({ id: section.id, beats: bars * section.timeSigNum })}
                          />
                        </Box>
                        <Divider orientation="vertical" />

                        {/* (Beats) Time Signature */}
                        <Text c="dimmed" size="sm">
                          Time Signature
                        </Text>
                        <Box style={{ width: "4rem" }}>
                          <Select
                            data={COMMON_TIME_SIGNATURES}
                            size="xs"
                            value={`${section.timeSigNum}/${section.timeSigDenom}`}
                            onChange={async (value) => {
                              if (!value || section.type !== TimelineSectionType.BEAT) return;
                              const [timeSigNum, timeSigDenom] = value.split("/").map(Number);
                              void upsertSection({ id: section.id, timeSigNum, timeSigDenom });
                            }}
                          />
                        </Box>
                        <Divider orientation="vertical" />

                        {/* (Beats) Time Signature */}
                        <Text c="dimmed" size="sm">
                          Snap
                        </Text>
                        <Box style={{ width: "4rem" }}>
                          <Select
                            data={SNAP_DIVISIONS}
                            size="xs"
                            value={section.snapFidelity}
                            onChange={async (value) => {
                              if (value === undefined || section.type !== TimelineSectionType.BEAT) return;
                              if (value === 0) {
                                void upsertSection({ id: section.id, snapFidelity: 0, snapEnabled: true });
                                return;
                              }
                              if (value === -1) {
                                void upsertSection({ id: section.id, snapFidelity: 0, snapEnabled: false });
                                return;
                              }
                              const snapFidelity = Number(value);
                              void upsertSection({ id: section.id, snapFidelity, snapEnabled: true });
                            }}
                          />
                        </Box>
                        <Divider orientation="vertical" />

                        {/* BPM */}
                        <Text c="dimmed" size="sm">
                          BPM
                        </Text>
                        <Box style={{ width: "4rem" }}>
                          <DebouncedNumberInput
                            size="xs"
                            placeholder="BPM"
                            value={section.bpm}
                            min={1}
                            onSave={(bpm) => void upsertSection({ id: section.id, bpm })}
                          />
                        </Box>
                        <Divider orientation="vertical" />

                        {/* Link */}
                        <Switch
                          label="Link"
                          checked={section.linkToNext}
                          onChange={(e) => {
                            if (e.currentTarget.checked !== undefined)
                              void upsertSection({ id: section.id, linkToNext: e.currentTarget.checked });
                          }}
                        />
                      </Group>
                    )}
                  </Box>
                </Flex>
              </Flex>
            </Box>
          </Menu.ContextMenu>

          {/* Portal events still bubble through React to the draggable item. */}
          <Menu.Dropdown onPointerDown={(event) => event.stopPropagation()}>
            <Menu.Label>Actions</Menu.Label>
            {/* <Menu.Item>Open</Menu.Item>
            <Menu.Item>Rename</Menu.Item>
            <Menu.Item>Duplicate</Menu.Item> */}
            {/* <Menu.Divider /> */}
            <ConfirmDelete onConfirm={() => onDelete(id)}>
              <Menu.Item color="red" closeMenuOnClick={false}>
                Delete
              </Menu.Item>
            </ConfirmDelete>
          </Menu.Dropdown>
        </Menu>
      </div>
    </div>
  );
};

const logger = new Logger("TimelineSectionItem", "purple");
const TimelineBeatSectionItem = ({
  eventId,
  itemId,
  section,
  sections,
}: {
  eventId: string;
  itemId: string;
  section: TimelineBeatSection;
  sections: TimelineSection[];
}) => {
  const { upsertSection, isSectionSaving } = useUpsertTimelineSectionItem(eventId, itemId);
  const { valueToPixels, pixelsToValue, range } = useTimelineContext();
  const beatMs = 60000 / section.bpm; // don't round: it's only for drawing
  const beatPx = valueToPixels(beatMs);
  const barPx = beatPx * section.timeSigNum;

  // if the beatPx becomes too small, then we no longer draw it
  const threshold = 12; // px

  // track the x and y within the div
  const { ref, x } = useMouse();

  // When the section starts before the visible range, dnd-timeline's itemContentStyle pads the content by the hidden
  // part (so labels stay in view). Everything in here then starts at the viewport edge, not the section start:
  // add hiddenPx to go from "px in this element" to "px from the section start", and subtract it again to draw.
  const hiddenPx = Math.max(0, valueToPixels(range.start - section.sectionStartTime));
  /** Mouse x, in px from the section's real start. */
  const sectionX = x + hiddenPx;

  const snapPx = section.snapEnabled ? (section.snapFidelity === 0 ? barPx : beatPx / section.snapFidelity) : 1;
  /** Snapped mouse position, in px from the section's real start. */
  const hoveredMarkerPos = Math.round(sectionX / snapPx) * snapPx;
  /** The snapped mouse position as a marker time: ms from the section start (not the song start), whole ms, inside the section. */
  const hoveredTimeMs = Math.min(getSectionLengthMs(section), Math.max(0, Math.round(pixelsToValue(hoveredMarkerPos))));

  // useMouse keeps its last x/y after the mouse leaves, so track hovering separately.
  const [hovered, setHovered] = useState(false);
  /** The beat the cursor is in (0-based), clamped so the last beat's right edge doesn't count as a new beat. */
  const hoveredBeat = Math.min(Math.floor(sectionX / beatPx), section.beats - 1);
  /** Sub-beat lines only make sense when snapping finer than a beat. */
  const showSubBeatLines = hovered && section.snapEnabled && section.snapFidelity > 1;

  // handle what cues the user can see
  const { item } = useGetItem(eventId, itemId);
  const cueOrder = useMemo(() => getCueOrder(sanitize(item?.rawLyrics ?? "")), [item?.rawLyrics]);
  const content = useMemo(() => generateRich(sanitize(item?.rawLyrics ?? "")), [item?.rawLyrics]);
  /** The lyrics shown in the modal: between the cues on either side of the click. */
  const [visibleRange, setVisibleRange] = useState<RichRange>();
  const inputTimingMode = useAppStore((s) => s.inputTimingMode);

  const [availableCues, setAvailableCues] = useState<string[]>();
  const [selectedCueToAddId, setSelectedCueToAddId] = useState<string>();

  const onCuePrevious = () => {
    if (!availableCues || !selectedCueToAddId) return;
    const index = availableCues.indexOf(selectedCueToAddId);
    const newIndex = index === 0 ? availableCues.length - 1 : index - 1;
    setSelectedCueToAddId(availableCues[newIndex]);
  };

  const onCueNext = () => {
    if (!availableCues || !selectedCueToAddId) return;
    const index = availableCues.indexOf(selectedCueToAddId);
    const newIndex = index === availableCues.length - 1 ? 0 : index + 1;
    setSelectedCueToAddId(availableCues[newIndex]);
  };

  // modal control
  const [isModalOpen, { open: openModal, close: closeModal }] = useDisclosure(false);
  /**
   * The time clicked, kept for the modal: by the time "Add" is pressed the mouse has moved over the modal, so the
   * hovered position no longer points at the click.
   */
  const [pendingTimeMs, setPendingTimeMs] = useState<number>();

  const onClick = (timeMs: number) => {
    logger.debug(`TimelineSectionItem clicked at timeMs=${timeMs}`);

    // first check if this section already has a cue there
    if (section.markers.some((m) => m.time === timeMs)) {
      logger.debug(`TimelineSectionItem clicked: section already has a cue at timeMs=${timeMs}`);

      notifications.show({
        title: "Cue already exists",
        message: `A cue already exists at this position.`,
        color: "red",
      });
      return;
    }

    // find the list of cues that are addable.
    // how to define?
    // look left & find the last cue, and look right and find the next cue. The new cue must be between them.
    // note that we have to look past this section as well.
    // therefore, the soln is:

    // 1. sort all sections according to startTime (ok cos no overlaps)
    // 2. go left to right, storing the cue until we go past a cue at timeMs.
    //   - if there was a cue, use that as the left cue
    //   - if there was no cue, then there was no start cue and it can be anything.
    // 3. continue going left to right, and the first cue we find after timeMs is the right cue.
    //   - if there was a cue, use that as the right cue
    //   - if there was no cue, then there was no end cue and it can be anything.

    // 4. the new cue must be between the left and right cues (if they exist)

    const sortedSections = [...sections].sort((a, b) => a.sectionStartTime - b.sectionStartTime);
    let leftCue: TimelineMarker | null = null;
    let rightCue: TimelineMarker | null = null;

    for (const s of sortedSections) {
      for (const m of [...s.markers].sort((a, b) => a.time - b.time)) {
        const markerTime = s.sectionStartTime + m.time;
        if (markerTime < section.sectionStartTime + timeMs) {
          leftCue = m;
        } else if (markerTime > section.sectionStartTime + timeMs) {
          rightCue = m;
          break;
        }
      }
      if (rightCue) break;
    }

    logger.debug(`TimelineSectionItem clicked: leftCue=${leftCue?.cueId}, rightCue=${rightCue?.cueId}`);

    // setup the availabile cues (markers point to cues via cueId; cueOrder holds cue ids)
    const leftCueIndex = leftCue ? cueOrder.indexOf(leftCue.cueId) : -1;
    const rightCueIndex = rightCue ? cueOrder.indexOf(rightCue.cueId) : cueOrder.length;

    const availableCues = cueOrder.slice(leftCueIndex + 1, rightCueIndex);
    setAvailableCues(availableCues);
    setSelectedCueToAddId(availableCues[0]);
    setVisibleRange(getRichRangeBetweenCues(content, leftCue?.cueId, rightCue?.cueId));
    setPendingTimeMs(timeMs);
    openModal();
  };

  const onAddCue = async () => {
    if (!selectedCueToAddId || pendingTimeMs === undefined) return;
    const timelineMarker: TimelineMarker = {
      id: crypto.randomUUID(),
      cueId: selectedCueToAddId,
      time: pendingTimeMs,
      type: TimelineMarkerType.CUE,
    };
    logger.debug(`TimelineSectionItem adding cue: ${JSON.stringify(timelineMarker)}`);
    // Only `markers` is sent, so other fields edited meanwhile aren't overwritten. Kept sorted by time.
    const markers = [...section.markers, timelineMarker].sort((a, b) => a.time - b.time);
    await upsertSection({ id: section.id, markers });
    closeModal();
  };

  // render the cue items
  // const [cueItems, setCueItems] = useState<ReactNode[]>([]);

  // useEffect(() => {

  // })
  const cueItems = useMemo<ReactNode[]>(() => {
    const nodes: ReactNode[] = [];
    for (const m of section.markers) {
      // calculate the exact x location
      const markerX = valueToPixels(m.time);
      // create a cue item for this marker

      nodes.push(
        <Box
          key={m.id}
          style={{
            position: "absolute",
            left: markerX - 2 - hiddenPx, // center the 8px wide box
            top: 0,
            width: 4,
            height: "100%",
            backgroundColor: "light-dark(var(--cue-color--light), var(--cue-color--dark))",
            // borderRadius: "var(--mantine-radius-sm)",
            pointerEvents: "none",
          }}
        >
          <Box
            style={{
              position: "absolute",
              bottom: 0,
              left: 0 + 2,

              backgroundColor: "light-dark(var(--cue-color--light), var(--cue-color--dark))",
              padding: "0.2rem",
            }}
          >
            <Title
              order={6}
              style={{
                textWrap: "nowrap",
              }}
            >
              Cue {cueOrder.indexOf(m.cueId) + 1}
            </Title>
          </Box>
        </Box>,
      );
    }

    return nodes;
  }, [section.markers, valueToPixels, hiddenPx, cueOrder]);
  return (
    <>
      <Modal
        opened={isModalOpen}
        zIndex={getDefaultZIndex("modal") + 2}
        onClose={closeModal}
        title="Place a cue marker"
        size="xl"
        centered
      >
        <Text>
          Add a cue marker at the selected point. <br />
          Cue markers can only be added in chronological order.
        </Text>
        <Divider my="sm" />
        {/* flex-start: a stretched (full-height) column has no room to stick */}
        <Group align="flex-start" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          <Box flex={8}>
            {availableCues?.length ? (
              <RichContent
                itemId={itemId}
                eventId={eventId}
                content={content}
                inputMode="disabled" // clicks only toggle a cue, nothing is edited
                currentlySelectedCueId={selectedCueToAddId}

                // disable de select
                setCurrentlySelectedCueId={(newCueId) => newCueId && setSelectedCueToAddId(newCueId)}
                visibleRange={visibleRange}
                isCursorSurface={false}
                indicatorNumber={0} // timing only: unused when disabled
                inputTimingMode={inputTimingMode} // timing only: unused when disabled
              />
            ) : (
              <Text c="dimmed">No cues fit here: the cues on either side are next to each other.</Text>
            )}
          </Box>
          {/* Sticks while the lyrics scroll (the modal content is the scroller). 60px = Mantine's sticky modal header
              (min-height 60px), so it sits just under the title instead of behind it. */}
          <Stack flex={4} style={{ position: "sticky", top: 60 }}>
            <Group gap="xs">
              <ActionIcon variant="light" color="lime" size={"lg"} onClick={onCuePrevious}>
                <IconChevronLeft width={"1.25rem"} />
              </ActionIcon>
              <Box w={"130px"}>
                <Select
                  comboboxProps={{ transitionProps: popTransition }}
                  allowDeselect={false}
                  value={selectedCueToAddId}
                  onChange={(value) => {
                    setSelectedCueToAddId(value ?? "");
                    // onSelectCue(value);
                  }}
                  data={(availableCues ?? []).map((cueId) => ({
                    value: cueId,
                    label: `Cue ${cueOrder.indexOf(cueId) + 1}`,
                  }))}
                  size="sm"
                  placeholder="Select cue"
                />
              </Box>
              <ActionIcon variant="light" color="lime" size="lg" onClick={onCueNext}>
                <IconChevronRight width={"1.25rem"} />
              </ActionIcon>
            </Group>
          </Stack>
        </Group>

        <Group justify="end" mt="sm">
          <Button color="gray" onClick={() => closeModal()}>
            Cancel adding
          </Button>
          <Button
            disabled={!selectedCueToAddId || pendingTimeMs === undefined}
            variant="light"
            loading={isSectionSaving}
            onClick={onAddCue}
          >
            Add selected cue
          </Button>
        </Group>
      </Modal>

      {beatPx < threshold ? (
        <Flex
          flex={1}
          style={{
            backgroundImage: `
      linear-gradient(to right, var(--mantine-color-default-border) 1px, transparent 2px),
      linear-gradient(to right, var(--mantine-color-dark-8) ${barPx}px, var(--mantine-color-dark-9) ${barPx}px)`,
            backgroundSize: `${barPx}px 100%, ${barPx * 2}px 100%`,
            position: "relative",
            cursor: "crosshair",
            backgroundPosition: `${-hiddenPx}px 0`, // tile from the section start, not the viewport edge
          }}
          ref={ref}
          onClick={() => onClick(hoveredTimeMs)}

          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* cue items */}
          {cueItems}
          {/* track the mouse position */}
          <Box
            style={{
              border: "2px solid light-dark(var(--cue-color--light), var(--cue-color--dark))",
              width: "12px",
              height: "70%",
              position: "absolute",
              top: `calc(50% - 35%)`,
              left: hoveredMarkerPos - hiddenPx - 6,
              pointerEvents: "none",

              // too many events when snap is not enabled cause animation to fail
              transition: section.snapEnabled ? "left 0.1s ease-out" : "none",
            }}
          ></Box>
        </Flex>
      ) : (
        <Flex
          flex={1}
          style={{
            backgroundImage: `
      linear-gradient(to right, var(--mantine-color-default-border) 1px, transparent 2px),
      linear-gradient(to right, var(--mantine-color-default-border) 1px, transparent 1px),
      linear-gradient(to right, var(--mantine-color-dark-8) ${barPx}px, var(--mantine-color-dark-9) ${barPx}px)`,
            backgroundSize: `${barPx}px 100%, ${beatPx}px 100%, ${barPx * 2}px 100%`,
            position: "relative",
            cursor: "crosshair",
            backgroundPosition: `${-hiddenPx}px 0`, // tile from the section start, not the viewport edge
          }}
          ref={ref}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => onClick(hoveredTimeMs)}
        >
          {/* The snap lines, ONLY for the hovered beat: one beat wide, a line every snapPx (sub-beats). */}
          {showSubBeatLines && (
            <Box
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: hoveredBeat * beatPx - hiddenPx,
                width: beatPx,
                pointerEvents: "none",
                backgroundImage:
                  "linear-gradient(to right, light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-3)) 1px, transparent 1px)",
                backgroundSize: `${snapPx}px 100%`,
              }}
            />
          )}
          {cueItems}

          {/* track the mouse position */}

          <Box
            hidden={!hovered}
            style={{
              border: "2px solid light-dark(var(--cue-color--light), var(--cue-color--dark))",
              width: "12px",
              height: "70%",
              position: "absolute",
              top: `calc(50% - 35%)`,
              left: hoveredMarkerPos - hiddenPx - 6,
              pointerEvents: "none",
              transition: section.snapEnabled ? "left 0.1s ease-out" : "none",
            }}
          ></Box>
        </Flex>
      )}
    </>
  );
};
