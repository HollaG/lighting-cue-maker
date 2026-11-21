import {
  Accordion,
  ActionIcon,
  Box,
  Button,
  Combobox,
  Divider,
  Flex,
  Group,
  Input,
  InputBase,
  Menu,
  Radio,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Text,
  Tooltip,
  useCombobox,
} from "@mantine/core";
import { memo, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useDeleteCue } from "../../../query-v2/cues/useDeleteCue";
import { useUpsertCue } from "../../../query-v2/cues/useUpsertCue";
import { useGetItem } from "../../../query-v2/items/useGetItem";
import { useUpsertItem } from "../../../query-v2/items/useUpsertItem";
import { useAppStore } from "../../../store/appStore";
import type { Cue } from "../../../types-v2/cue";
import { removeCueFromRawLyrics } from "../../../utils/cue/cueForm";
import { notifications } from "../../../utils/notifications";
import { ConfirmDeleteButton } from "../../ConfirmDeleteButton/ConfirmDeleteButton";
import { CardBase } from "../../Cues/CardBase";
import { useGetOptionSets } from "../../../query-v2/option-sets/useGetOptionSets";
// import { useGetEvent } from "../../../query-v2/events/useGetEvent";
import { useGetFixtureGroups } from "../../../query-v2/fixture-groups/useGetFixtureGroups";
import type { FixtureGroup } from "../../../types-v2/fixtureGroups";
import { OptionSetType, SelectableType, type OptionSet } from "../../../types-v2/optionSet";
import { useQueryClient } from "@tanstack/react-query";
import { makeGetCuesQueryKey } from "../../../query-v2/cues/useGetCues";
import { IconCaretDown, IconEdit, IconEye, IconHelpCircle, IconInfoSquareRounded, IconPlus } from "@tabler/icons-react";
import { popTransition } from "../../../utils/animations";
import { DebouncedNumberInput } from "../../Inputs/DebouncedNumberInput";
import { DebouncedTextarea } from "../../Inputs/DebouncedTextarea";
import { useGetTimeline } from "../../../query-v2/timeline/useGetTimeline";
import { getTimelineHoldTimeMs } from "../../../types-v2/timeline";

/**
 * One cue in the cues panel: header actions (copy, preview, delete) and comments.
 *
 * Memoized, and told whether it is selected instead of reading the selected id: changing cue then re-renders only
 * the two cards whose `isSelected` flips, not every card.
 */
export const CueCard = memo(function CueCard({
  eventId,
  cue,
  cueNumber,
  copyOptions,
  isSelected,
}: {
  eventId: string;
  cue: Cue;
  /** 1-based position in the lyrics. */
  cueNumber: number;
  /**
   * Every cue of the item in lyric order (this one included), for "Copy another cue". Ids and labels only, so it
   * stays the same array when a cue is edited and doesn't re-render every card.
   */
  copyOptions: { value: string; label: string }[];
  isSelected: boolean;
}) {
  const itemId = cue.itemId;

  const setSelectedCueId = useAppStore((s) => s.setCurrentlySelectedCueId);
  /** True while a selection made from inside this card is on its way: the scroll effect below skips it. */
  const skipNextScrollRef = useRef(false);
  /**
   * Selects this cue without scrolling: for edits made in this card, which the user is already looking at.
   * Passed down so the pickers below don't need the cue id.
   */
  const setSelected = () => {
    // Already selected: `isSelected` won't change and the effect won't run, so leave the flag unset.
    if (!isSelected) skipNextScrollRef.current = true;
    setSelectedCueId(cue.id);
  };
  const showCueIdentifiers = useAppStore((s) => s.showCueIdentifiers);

  const { item } = useGetItem(eventId, itemId);
  // const { event } = useGetEvent(eventId)
  const { fixtureGroups } = useGetFixtureGroups(eventId);
  const { mutateAsync: upsertCue } = useUpsertCue(eventId, itemId);
  const { mutateAsync: deleteCue } = useDeleteCue(eventId, itemId);
  const { mutateAsync: upsertItem } = useUpsertItem(eventId);

  // --- Scroll into view ---------
  // Selecting this cue from elsewhere (e.g. clicking its marker in the lyrics) brings the card into view.
  // Not when the selection came from an edit in this card (`setSelected`).
  // "nearest" leaves an already-visible card where it is, e.g. when "Preview cue" on this card selected it.
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isSelected) return;
    if (skipNextScrollRef.current) {
      skipNextScrollRef.current = false;
      return;
    }
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [isSelected]);

  /** Select this cue and bring its marker in the lyrics into view. */
  const onPreview = () => {
    if (!isSelected) setSelected();
    else setSelectedCueId("");

    // document
    //   .querySelector<HTMLElement>(`[data-cue-id="${cue.id}"]`)
    //   ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // --- Copy another cue ---------
  const [copyQuery, setCopyQuery] = useState("");
  const queryClient = useQueryClient();
  const filteredCopyOptions = copyOptions
    .filter((option) => option.value !== cue.id)
    .filter((option) => copyQuery === "" || option.label.includes(copyQuery));

  /** Copies everything the cue sets (not its comments) from another cue. */
  const onCopyFrom = async (sourceId: string, sourceLabel: string) => {
    // Read the source from the cache at click time: the options only hold ids.
    const source = queryClient
      .getQueryData<Cue[]>(makeGetCuesQueryKey(eventId, itemId))
      ?.find((c) => c.id === sourceId);
    if (!source) return;
    try {
      await upsertCue({
        id: cue.id,
        transition: source.transition,
        mode: source.mode,
        activeFixtureGroupIds: source.activeFixtureGroupIds,
        selectableIds: source.selectableIds,
        overrides: source.overrides,
      });
      notifications.show({ title: `Copied ${sourceLabel.toLowerCase()}!`, message: "" });

      // set this cue as selected
      setSelected();
    } catch {
      // error notif handled by api.ts
    }
  };

  // --- Active fixture groups ---------
  /** Switch.Group passes the whole new list of switched-on group ids, with the clicked one added or removed. */
  const onActiveFixtureGroupsChange = (activeFixtureGroupIds: string[]) => {
    void upsertCue({ id: cue.id, activeFixtureGroupIds })
      .catch(console.error)
      .then(() => setSelected());
  };

  // --- Delete ---------
  /** Deletes the cue, then removes its marker from the lyrics. */
  const onDelete = async () => {
    await deleteCue(cue.id);
    if (item) await upsertItem({ id: item.id, rawLyrics: removeCueFromRawLyrics(item.rawLyrics, cue.id) });
    if (isSelected) setSelectedCueId(undefined);
  };

  // --- Custom DMX ---------
  const cueHasOverrides = Object.keys(cue.overrides).length > 0;
  const setIsDmxDrawerOpen = useAppStore((s) => s.setIsDmxDrawerOpen);

  // --- Transitions and fades ---------
  // Cues saved before CueTransition had fields hold `{}`: fall back to "manual, instant" (the old CueCard's default).
  // Always save both fields: the server replaces `transition` as a whole.
  const holdTimeMs = cue.transition.holdTimeMs ?? -1;
  const transitionTimeMs = cue.transition.transitionTimeMs ?? 0;
  const saveTransition = (change: Partial<Cue["transition"]>) => {
    void upsertCue({ id: cue.id, transition: { holdTimeMs, transitionTimeMs, ...change } })
      .then(() => setSelected())
      .catch(console.error);
  };
  /** Keep arrow keys in the input instead of moving to the other radio in the group. */
  const keepArrowKeysInInput = (event: KeyboardEvent) => {
    if (event.key.startsWith("Arrow")) event.stopPropagation();
  };

  // --- Sync to timeline ---------
  // A cue with a marker on the timeline holds until the next marker; its own hold time is kept but not used.
  const { timeline } = useGetTimeline(eventId, itemId);
  const timelineHoldTimeMs = timeline ? getTimelineHoldTimeMs(timeline, cue.id) : null;
  const isCueInTimeline = timelineHoldTimeMs !== null;
  /** The hold time that applies: the timeline's, else the cue's own. -1 = until changed manually. */
  const effectiveHoldTimeMs = timelineHoldTimeMs ?? holdTimeMs;

  return (
    <div ref={cardRef} id={`cue-card-${cue.id}`} data-cursor-surface="cueCard" data-cursor-anchor={cue.id}>
      <div id={cueNumber === 1 ? "tour-event-7" : undefined}>
        <CardBase
          isActive={isSelected}
          shadow={isSelected ? "lg" : "none"}
          style={{
            alignSelf: "start",
          }}
        >
          <Stack gap="md">
            <Group align="center" justify="space-between">
              <Group gap="xs">
                {/* <Title
                order={4}
                style={{
                  backgroundColor: isSelected
                    ? "light-dark(var(--cue-color--light-selected), var(--cue-color--dark-selected))"
                    : "transparent",
                }}
              >
                Cue {cueNumber}
              </Title> */}
                <Tooltip
                  label="Preview this cue in the visualiser"
                  openDelay={300}
                  position="top"
                  withArrow
                  transitionProps={popTransition}
                >
                  <Button
                    variant="light"
                    vars={() => ({
                      root: isSelected
                        ? {}
                        : {
                            "--button-bg": "transparent",
                            // The same colour as the selected fill.
                            "--button-bd": "1px solid var(--mantine-primary-color-light)",
                          },
                    })}
                    rightSection={<IconEye width="1rem" />}
                    onClick={onPreview}
                    id={cueNumber === 1 ? "tour-event-8" : undefined}
                  >
                    {" "}
                    Cue {cueNumber}{" "}
                  </Button>
                </Tooltip>
                {showCueIdentifiers && (
                  <Tooltip label={`Cue ID: ${cue.id}`}>
                    <Text c="dimmed" style={{ textDecoration: "underline dotted" }}>
                      {cue.id.slice(0, 4)}
                    </Text>
                  </Tooltip>
                )}

                <Menu shadow="md">
                  <Menu.Target>
                    <Button variant="transparent" size="xs">
                      Copy another cue
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown mah={500} style={{ overflowY: "auto" }}>
                    <Menu.Search
                      value={copyQuery}
                      onChange={(event) => setCopyQuery(event.currentTarget.value)}
                      placeholder="Search cues"
                    />
                    <Menu.Label>Copy all settings from:</Menu.Label>
                    {filteredCopyOptions.length > 0 ? (
                      filteredCopyOptions.map((option) => (
                        <Menu.Item key={option.value} onClick={() => void onCopyFrom(option.value, option.label)}>
                          <Group>
                            {option.label}
                            <Text c="dimmed" fz="sm">
                              {option.value.slice(0, 4)}
                            </Text>
                          </Group>
                        </Menu.Item>
                      ))
                    ) : (
                      <Menu.Item disabled>
                        <Text c="dimmed" size="sm" ta="center" py="xs">
                          No cues found
                        </Text>
                      </Menu.Item>
                    )}
                  </Menu.Dropdown>
                </Menu>

                {/* <Button variant="light" size="xs" onClick={onPreview} leftSection={<IconEye size="1rem" />}>
                Preview cue
              </Button> */}
              </Group>

              <ConfirmDeleteButton
                message={`Delete cue ${cueNumber}? This cannot be undone`}
                onConfirm={onDelete}
                buttonProps={{ variant: "transparent" }}
              />
            </Group>

            <Switch.Group value={cue.activeFixtureGroupIds} onChange={onActiveFixtureGroupsChange}>
              <SimpleGrid
                type="container"
                cols={{
                  base: 1,
                  "400px": 2,
                  "700px": 3,
                  "1000px": 4,
                }}
                spacing="md"
                verticalSpacing="md"
              >
                {fixtureGroups.map((fixtureGroup) => (
                  <CueCardFixtureGroupOptionSetPickers
                    key={fixtureGroup.id}
                    fixtureGroup={fixtureGroup}
                    cue={cue}
                    setSelected={setSelected}
                  />
                ))}

                {/* DMX Manual Override card */}
                <Stack
                  gap="xs"
                  p="lg"
                  style={{
                    borderRadius: "6px",
                    backgroundColor: !cueHasOverrides
                      ? "transparent"
                      : "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))",
                    border: "1px solid light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))",

                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  <Group>
                    <Group gap="xs" align="center">
                      <Text fw="bold">Custom settings</Text>
                      <Tooltip
                        label="Configure fixtures how you'd like - not restricted to fixed selections"
                        position="top"
                        withArrow
                      >
                        <IconInfoSquareRounded
                          width="0.75rem"
                          height="0.75rem"
                          style={{ color: "var(--mantine-gray-5)" }}
                        />
                      </Tooltip>
                    </Group>
                    <Flex flex={1} />
                    <ActionIcon
                      variant={cueHasOverrides ? "light" : "outline"}
                      size="sm"
                      onClick={() => {
                        setIsDmxDrawerOpen(true);
                        setSelected();
                      }}
                    >
                      {cueHasOverrides ? <IconEdit size={"0.75rem"} /> : <IconPlus size={"0.75rem"} />}
                    </ActionIcon>
                    {/* <Switch
                    styles={{
                      track: { cursor: "pointer" },
                      input: { cursor: "pointer" },
                    }}
                    value={fixtureGroup.id}
                    onLabel="ON"
                    offLabel="OFF"
                  /> */}
                  </Group>
                  <Divider />
                  {/* {optionSets.map((optionSet) => (
                  // Render the option set corresponding to the OptionSetType

                  <OptionSetWrapper key={optionSet.id} optionSet={optionSet} eventId={fixtureGroup.eventId} cue={cue} />
                ))} */}

                  {!cueHasOverrides ? (
                    <Text c="dimmed" size="sm">
                      No custom settings yet
                    </Text>
                  ) : (
                    <Text c="dimmed" size="sm">
                      Some values are overriden, click Edit to see them
                    </Text>
                  )}
                </Stack>
              </SimpleGrid>
            </Switch.Group>
            <SimpleGrid
              cols={{
                base: 1,
                "400px": 2,
              }}
              spacing={0}
              type="container"
            >
              {/* TODO: sync Accordion state when following */}
              <Accordion>
                <Accordion.Item value="holdTime">
                  <Tooltip
                    label="The hold time is currently being set by the timeline; adjust the cue's timing there instead."
                    withArrow
                    disabled={!isCueInTimeline}
                    transitionProps={popTransition}
                  >
                    <Accordion.Control disabled={isCueInTimeline}>
                      {/* Change to next cue (currently {holdTimeMs === -1 ? "manually" : `after ${holdTimeMs / 1000}s`}) */}
                      Cue hold time ({isCueInTimeline ? "set by the timeline: " : "currently "}
                      {effectiveHoldTimeMs === -1 ? "infinite" : `${effectiveHoldTimeMs / 1000}s`})
                    </Accordion.Control>
                  </Tooltip>

                  <Accordion.Panel>
                    <Radio.Group
                      value={holdTimeMs === -1 ? "manual" : "auto"}
                      onChange={(value) => {
                        if (value === "manual") saveTransition({ holdTimeMs: -1 });
                        else if (holdTimeMs === -1) saveTransition({ holdTimeMs: 100 });
                      }}
                      disabled={isCueInTimeline}
                    >
                      <Group wrap="nowrap" gap="xs">
                        <Radio label="Only when manually changed" value={"manual"} style={{ flex: 1 }} />
                        <Radio.Card
                          style={{ flex: 1 }}
                          styles={{
                            card: {
                              border: 0,
                            },
                          }}
                          value="auto"
                        >
                          <Group wrap="nowrap" gap="xs">
                            <Radio.Indicator />
                            <DebouncedNumberInput
                              min={1}
                              allowDecimal={false}
                              label="Change after"
                              suffix="ms"
                              // While manual, show the 100 that picking "auto" will set.
                              value={holdTimeMs === -1 ? 100 : holdTimeMs}
                              onSave={(value) => saveTransition({ holdTimeMs: value })}
                              disabled={holdTimeMs === -1 || isCueInTimeline}
                              onKeyDown={keepArrowKeysInInput}
                            />
                          </Group>
                        </Radio.Card>
                      </Group>
                    </Radio.Group>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
              <Accordion>
                <Accordion.Item value="holdTime">
                  <Accordion.Control>
                    Cue transition time to next cue (currently{" "}
                    {transitionTimeMs === 0 ? "Instant" : `${transitionTimeMs / 1000}s`})
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Radio.Group
                      value={transitionTimeMs === 0 ? "instant" : "timed"}
                      onChange={(value) => {
                        if (value === "instant") saveTransition({ transitionTimeMs: 0 });
                        else if (transitionTimeMs === 0) saveTransition({ transitionTimeMs: 100 });
                      }}
                    >
                      <Group wrap="nowrap" gap="xs">
                        <Radio label="Instant transition" value="instant" flex={1} />
                        <Radio.Card
                          flex={1}
                          styles={{
                            card: {
                              border: 0,
                            },
                          }}
                          value="timed"
                        >
                          <Group wrap="nowrap">
                            <Radio.Indicator />
                            <Box style={{ maxWidth: "200px" }}>
                              <DebouncedNumberInput
                                min={1}
                                allowDecimal={false}
                                label="Transition over"
                                suffix="ms"
                                // While instant, show the 100 that picking "timed" will set.
                                value={transitionTimeMs === 0 ? 100 : transitionTimeMs}
                                onSave={(value) => saveTransition({ transitionTimeMs: value })}
                                disabled={transitionTimeMs === 0}
                                onKeyDown={keepArrowKeysInInput}
                              />
                            </Box>
                          </Group>
                        </Radio.Card>
                      </Group>
                    </Radio.Group>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </SimpleGrid>
            {/* Autosaved; a pending save still goes out if the card unmounts mid-typing. */}
            <DebouncedTextarea
              label="Comments"
              minRows={1}
              maxRows={4}
              variant="unstyled"
              autosize
              debounceMs={600}
              value={cue.comments}
              onSave={(comments) => void upsertCue({ id: cue.id, comments }).catch(console.error)}
              placeholder="Write any comments regarding this cue here..."
              styles={{ input: { fontSize: "16px" } }}
            />
          </Stack>
        </CardBase>
      </div>
    </div>
  );
});

const CueCardFixtureGroupOptionSetPickers = ({
  fixtureGroup,
  cue,
  setSelected,
}: {
  fixtureGroup: FixtureGroup;
  cue: Cue;
  /** Selects the cue this card is for. */
  setSelected: () => void;
}) => {
  const { optionSets } = useGetOptionSets(fixtureGroup.eventId, fixtureGroup.id);
  const disabled = !cue.activeFixtureGroupIds.includes(fixtureGroup.id); // duplicated in the picker

  const setSelectedFixtureIds = useAppStore((s) => s.setSelectedFixtureIds);

  let label = `${fixtureGroup.name}`;
  if (fixtureGroup.description) {
    label += `: ${fixtureGroup.description}`;
  }
  return (
    <Stack
      gap="xs"
      p="lg"
      style={{
        borderRadius: "6px",
        backgroundColor: disabled
          ? "transparent"
          : "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))",
        border: "1px solid light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))",

        transition: "all 0.2s ease-in-out",
        minHeight: 0,
      }}
    >
      <Group wrap="nowrap" gap="xs">
        <Group gap="xs" align="center" wrap="nowrap" miw={0}>
          <Tooltip label={label} position="top" withArrow transitionProps={popTransition} openDelay={300}>
            <Text fw="bold" truncate="end">
              {fixtureGroup.name}
            </Text>
          </Tooltip>
          {/* <Tooltip label={fixtureGroup.description} position="top" withArrow transitionProps={popTransition}>
            <IconInfoSquareRounded
              width="0.75rem"
              height="0.75rem"
              style={{ color: "var(--mantine-gray-5)", flexShrink: 0 }}
            />
          </Tooltip> */}
        </Group>
        <Flex flex={1} />
        {/* <Button variant="transparent" size="xs" onClick={() => setSelectedFixtureIds(fixtureGroup.fixtureIds)}>
          Select fixtures
        </Button> */}
        <Tooltip
          label="Highlight the fixtures in the visualiser"
          openDelay={300}
          position="top"
          withArrow
          transitionProps={popTransition}
        >
          <ActionIcon variant="light">
            <IconEye size="1rem" onClick={() => setSelectedFixtureIds(fixtureGroup.fixtureIds)} />
          </ActionIcon>
        </Tooltip>

        {/* <ActionIcon variant="transparent" onClick={() => setIsExpanded((prev) => !prev)}>
          <IconChevronDown size="1rem" />
        </ActionIcon> */}
        <Switch
          styles={{
            track: { cursor: "pointer" },
            input: { cursor: "pointer" },
          }}
          value={fixtureGroup.id}
          onLabel="ON"
          offLabel="OFF"
          size="sm"
        />
      </Group>
      <Divider />
      <Stack gap="xs">
        {optionSets.map((optionSet) => (
          // Render the option set corresponding to the OptionSetType

          <OptionSetWrapper
            key={optionSet.id}
            optionSet={optionSet}
            eventId={fixtureGroup.eventId}
            cue={cue}
            setSelected={setSelected}
          />
        ))}
      </Stack>
    </Stack>
  );
};

/**
 * Wraps the select/slider/whatever interactive components that users interact with when they
 * change cue settings.
 *
 * This component has some shared logic, such as setting the enabled/disabled state, etc.
 *
 * @param param0
 * @returns
 */
const OptionSetWrapper = ({
  optionSet,
  eventId,
  cue,
  setSelected,
}: {
  cue: Cue;
  optionSet: OptionSet;
  eventId: string;
  /** Selects the cue this picker edits. */
  setSelected: () => void;
}) => {
  const queryClient = useQueryClient();
  const { mutateAsync: upsertCue } = useUpsertCue(eventId, cue.itemId);
  const disabled = !cue.activeFixtureGroupIds.includes(optionSet.fixtureGroupId); // duplicated in the picker

  // The list of selectables for this option set
  const possibleSelectableIdsForOptionSet = optionSet.selectables.map((s) => s.id);

  // the list of selectables currently selected for this option set.
  const selectedSelectableIds = cue.selectableIds.filter((id) => possibleSelectableIdsForOptionSet.includes(id));

  /** Replaces this option set's picks in the cue, keeping every other option set's picks. */
  const onChange = (newSelectedSelectableIds: string[]) => {
    // Read the cue from the cache, not the `cue` prop: another option set may have saved since this render.
    const latestCue = queryClient
      .getQueryData<Cue[]>(makeGetCuesQueryKey(eventId, cue.itemId))
      ?.find((c) => c.id === cue.id);
    if (!latestCue) return;

    const otherSelectableIds = latestCue.selectableIds.filter((id) => !possibleSelectableIdsForOptionSet.includes(id));

    void upsertCue({ id: cue.id, selectableIds: [...otherSelectableIds, ...newSelectedSelectableIds] })
      .catch(console.error)
      .then(() => setSelected());
  };

  if (optionSet.selectables.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        No values available for selection
      </Text>
    );
  }

  // Pick the component for this option set type. Render it as JSX (not by calling it as a function),
  // so React treats it as its own component and hooks inside it work.
  const Picker = OptionSetTypeToComponentMap[optionSet.type];
  return (
    <Picker
      optionSet={optionSet}
      eventId={eventId}
      cue={cue}
      selectedSelectableIds={selectedSelectableIds}
      onChange={onChange}
      disabled={disabled}
    />
  );
};

type OptionSetTypeToComponentProps = {
  optionSet: OptionSet;
  eventId: string;
  cue: Cue;
  selectedSelectableIds: string[];
  disabled: boolean;

  /** Always pass the whole set of new selectables when changed. */
  onChange: (newSelectedSelectableIds: string[]) => void;
};

/** Intensity option set is a slider. */
const OptionSetIntensityType = ({
  optionSet,
  selectedSelectableIds,
  onChange,
  disabled,
}: OptionSetTypeToComponentProps) => {
  // In the Intensity option set, all selectables should be of type SelectableType.INTENSITY.
  // Do a sanity filter check here
  const intensitySelectables = optionSet.selectables.filter((s) => s.type === SelectableType.INTENSITY);

  // For an intensity selectable, there will only be one selected.
  // If none are selected, then the slider will be at 0.
  const selectedValue =
    selectedSelectableIds.length > 0
      ? (intensitySelectables.find((s) => s.id === selectedSelectableIds[0])?.percent ?? 0)
      : 0;

  // Mantine's Slider fires `onChange` on every move while dragging, so only the thumb position follows it.
  // The save happens once, in `onChangeEnd`, when the user lets go.
  const [dragValue, setDragValue] = useState(selectedValue);
  // Follow saves from elsewhere (another user, "Copy another cue").
  useEffect(() => setDragValue(selectedValue), [selectedValue]);

  // When the drag ends, find the selectable id that corresponds to the final value, and call onChange with that id.
  const handleChangeEnd = (newValue: number) => {
    if (newValue === selectedValue) return; // dropped back where it started: nothing to save
    const newSelectable = intensitySelectables.find((s) => s.percent === newValue);
    if (newSelectable) {
      onChange([newSelectable.id]);
    } else {
      // If the new value doesn't correspond to any selectable, then we can just clear the selection.
      onChange([]);
    }
  };
  return (
    <Input.Wrapper size="sm" label={<OptionSetLabel optionSet={optionSet} />} required={optionSet.required}>
      <Slider
        size="sm"
        // Mark labels are absolutely positioned below the track and take no space, so reserve room for them.
        mb="lg"
        restrictToMarks
        marks={intensitySelectables.map((mark) => ({ value: mark.percent, label: mark.name }))}
        disabled={disabled}
        value={dragValue}
        onChange={setDragValue}
        onChangeEnd={handleChangeEnd}
      />
    </Input.Wrapper>
  );
};

/** Colour option set is a searchable dropdown of colour swatches, with a Clear button. Single pick. */
const OptionSetColourType = ({
  optionSet,
  selectedSelectableIds,
  onChange,
  disabled,
}: OptionSetTypeToComponentProps) => {
  // In the Colour option set, all selectables should be of type SelectableType.COLOUR. Sanity filter.
  const colourSelectables = optionSet.selectables.filter((s) => s.type === SelectableType.COLOUR);
  const selected = colourSelectables.find((s) => s.id === selectedSelectableIds[0]);

  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });

  // The input shows the picked colour's name, and becomes a search box while the dropdown is open.
  const [search, setSearch] = useState(selected?.name ?? "");
  // Follow saves from elsewhere (another user, "Copy another cue"), but never while the user is searching.
  useEffect(() => {
    if (!combobox.dropdownOpened) setSearch(selected?.name ?? "");
  }, [selected?.name]);

  // Show every option while the input still holds the picked name, i.e. nothing has been typed yet.
  const filteredSelectables =
    search === (selected?.name ?? "")
      ? colourSelectables
      : colourSelectables.filter((s) => s.name.toLowerCase().includes(search.toLowerCase().trim()));

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(selectableId) => {
        onChange([selectableId]);
        setSearch(colourSelectables.find((s) => s.id === selectableId)?.name ?? "");
        combobox.closeDropdown();
      }}
      styles={{ dropdown: { zIndex: 99 } }}
    >
      <Combobox.Target targetType="input">
        <div>
          <InputBase
            required={optionSet.required}
            // A disabled input gets no focus or click events, so the dropdown can't open and the search text isn't cleared.
            disabled={disabled}
            label={<OptionSetLabel optionSet={optionSet} />}
            rightSection={<Combobox.Chevron />}
            rightSectionPointerEvents="none"
            leftSection={<ColourSwatch hex={selected?.colour.hex} size="1rem" />}
            placeholder="Search value"
            value={search}
            onChange={(event) => {
              combobox.openDropdown();
              combobox.updateSelectedOptionIndex();
              setSearch(event.currentTarget.value);
            }}
            onClick={() => {
              combobox.openDropdown();
              setSearch("");
            }}
            onFocus={() => {
              combobox.openDropdown();
              setSearch("");
            }}
            onBlur={() => {
              combobox.closeDropdown();
              setSearch(selected?.name ?? "");
            }}
          />

          {/* Deprecated - we now allow users to "turn off" fixture groups, so this is no longer needed */}
          {/* <Button
            size="xs"
            variant="transparent"
            color="gray"
            disabled={disabled}
            onClick={() => {
              setSearch("");
              onChange([]);
            }}
          >
            Clear
          </Button> */}
        </div>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {filteredSelectables.length > 0 ? (
            filteredSelectables.map((s) => (
              // Value is the selectable id, not the name: names are for display and may repeat.
              <Combobox.Option value={s.id} key={s.id}>
                <Group>
                  <ColourSwatch hex={s.colour.hex} size="20px" />
                  <Text>{s.name}</Text>
                </Group>
              </Combobox.Option>
            ))
          ) : (
            <Combobox.Empty>Nothing found</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};

/** A small square of colour. White gets an outline so it shows on a light background. */
const ColourSwatch = ({ hex, size }: { hex?: string; size: string }) => (
  <Box
    style={{
      width: size,
      height: size,
      borderRadius: "4px",
      backgroundColor: hex,
      border: hex?.toLowerCase() === "#ffffff" ? "2px solid light-dark(black, transparent)" : undefined,
    }}
  />
);

/** Option set name with its description in a tooltip. */
const OptionSetLabel = ({ optionSet }: { optionSet: OptionSet }) => (
  <Tooltip label={optionSet.description || "No description available"} position="top" withArrow>
    {/* inline-flex so the label's required asterisk (added after this by the input) stays on the same row */}
    <Group align="center" gap={4} style={{ display: "inline-flex" }}>
      {optionSet.name} <IconHelpCircle width="1rem" />
    </Group>
  </Tooltip>
);

const OptionSetCustomType = () => {
  return <></>;
};

const OptionSetPositionType = () => {
  return <></>;
};

const OptionSetPatternEffectType = ({
  optionSet,
  selectedSelectableIds,
  onChange,
  disabled,
}: OptionSetTypeToComponentProps) => {
  // in the Valueless option set, all selectables should be of type SelectableType.VALUELESS. Sanity filter.
  const patternSelectables = optionSet.selectables.filter((s) => s.type === SelectableType.EFFECT_PATTERN);

  const data = patternSelectables.map((s) => ({ value: s.id, label: s.name }));

  // users can select from these selectables. (only 1 for now)
  const selectedValue =
    selectedSelectableIds.length > 0 ? patternSelectables.find((s) => s.id === selectedSelectableIds[0]) : undefined;

  const onValueChange = (newSelectableId: string | undefined) => {
    if (newSelectableId) {
      onChange([newSelectableId]);
    } else {
      onChange([]);
    }
  };

  return (
    <Select
      comboboxProps={{ transitionProps: popTransition }}
      searchable
      label={<OptionSetLabel optionSet={optionSet} />}
      data={data}
      placeholder={"Pick a value"}
      size="sm"

      value={selectedValue?.id ?? null}
      onChange={(newValue) => onValueChange(newValue ?? undefined)}

      clearable
      rightSection={<IconCaretDown width="0.75rem" />}
      clearSectionMode="clear"
      required={optionSet.required}
      disabled={disabled}
      // readOnly={readOnly}
    />
  );
};

// Valueless refers to option sets that don't affect the DMX, so are just plain options.
const OptionSetValuelessType = ({
  optionSet,
  selectedSelectableIds,
  onChange,
  disabled,
}: OptionSetTypeToComponentProps) => {
  // in the Valueless option set, all selectables should be of type SelectableType.VALUELESS. Sanity filter.
  const valuelessSelectables = optionSet.selectables.filter((s) => s.type === SelectableType.VALUELESS);

  const data = valuelessSelectables.map((s) => ({ value: s.id, label: s.name }));

  // users can select from these selectables. (only 1 for now)
  const selectedValue =
    selectedSelectableIds.length > 0 ? valuelessSelectables.find((s) => s.id === selectedSelectableIds[0]) : undefined;

  const onValueChange = (newSelectableId: string | undefined) => {
    if (newSelectableId) {
      onChange([newSelectableId]);
    } else {
      onChange([]);
    }
  };

  return (
    <Select
      comboboxProps={{ transitionProps: popTransition }}
      searchable
      label={<OptionSetLabel optionSet={optionSet} />}
      data={data}
      placeholder={"Pick a value"}
      size="sm"

      value={selectedValue?.id ?? null}
      onChange={(newValue) => onValueChange(newValue ?? undefined)}

      clearable
      rightSection={<IconCaretDown width="0.75rem" />}
      clearSectionMode="clear"
      required={optionSet.required}
      disabled={disabled}
      // readOnly={readOnly}
    />
  );
};
const OptionSetTypeToComponentMap = {
  [OptionSetType.INTENSITY]: OptionSetIntensityType,
  [OptionSetType.COLOUR]: OptionSetColourType,
  [OptionSetType.CUSTOM]: OptionSetCustomType,
  [OptionSetType.POSITION]: OptionSetPositionType,
  [OptionSetType.VALUELESS]: OptionSetValuelessType,
  [OptionSetType.PATTERN]: OptionSetPatternEffectType,
};
