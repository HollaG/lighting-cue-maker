import {
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
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Text,
  Textarea,
  Title,
  Tooltip,
  useCombobox,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { useEffect, useRef, useState } from "react";
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
import { useGetEvent } from "../../../query-v2/events/useGetEvent";
import { useGetFixtureGroups } from "../../../query-v2/fixture-groups/useGetFixtureGroups";
import type { FixtureGroup } from "../../../types-v2/fixtureGroups";
import { OptionSetType, SelectableType, type OptionSet } from "../../../types-v2/optionSet";
import { useQueryClient } from "@tanstack/react-query";
import { makeGetCuesQueryKey } from "../../../query-v2/cues/useGetCues";
import { IconCaretDown, IconEdit, IconHelpCircle, IconInfoSquareRounded, IconPlus } from "@tabler/icons-react";
import { popTransition } from "../../../utils/animations";

/**
 * One cue in the cues panel: header actions (copy, preview, delete) and comments.
 */
export const CueCard = ({
  eventId,
  cue,
  cueNumber,
  orderedCues,
}: {
  eventId: string;
  cue: Cue;
  /** 1-based position in the lyrics. */
  cueNumber: number;
  /** Every cue of the item in lyric order, for "Copy another cue". */
  orderedCues: Cue[];
}) => {
  const itemId = cue.itemId;

  const currentlySelectedCueId = useAppStore((s) => s.currentlySelectedCueId);
  const setSelectedCueId = useAppStore((s) => s.setCurrentlySelectedCueId);
  const showCueIdentifiers = useAppStore((s) => s.showCueIdentifiers);
  const isSelected = currentlySelectedCueId === cue.id;

  const { item } = useGetItem(eventId, itemId);
  // const { event } = useGetEvent(eventId)
  const { fixtureGroups } = useGetFixtureGroups(eventId);
  const { mutateAsync: upsertCue } = useUpsertCue(eventId, itemId);
  const { mutateAsync: deleteCue } = useDeleteCue(eventId, itemId);
  const { mutateAsync: upsertItem } = useUpsertItem(eventId);

  // --- Scroll into view ---------
  // Selecting this cue (e.g. clicking its marker in the lyrics) brings the card into view.
  // "nearest" leaves an already-visible card where it is, e.g. when "Preview cue" on this card selected it.
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isSelected) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [isSelected]);

  /** Select this cue and bring its marker in the lyrics into view. */
  const onPreview = () => {
    setSelectedCueId(cue.id);
    // RichWord puts `data-cue-id` on each cue marker. Not rendered in lyric mode, so then this does nothing.
    document
      .querySelector<HTMLElement>(`[data-cue-id="${cue.id}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // --- Comments (autosaved) ---------
  const [comments, setComments] = useState(cue.comments);
  const saveComments = useDebouncedCallback(
    (value: string) => void upsertCue({ id: cue.id, comments: value }).catch(console.error),
    { delay: 600, flushOnUnmount: true }, // leaving mid-typing still saves
  );

  // --- Copy another cue ---------
  const [copyQuery, setCopyQuery] = useState("");
  const copyOptions = orderedCues
    .map((other, index) => ({ cue: other, number: index + 1 }))
    .filter((option) => option.cue.id !== cue.id)
    .filter((option) => copyQuery === "" || `Cue ${option.number}`.includes(copyQuery));

  /** Copies everything the cue sets (not its comments) from another cue. */
  const onCopyFrom = async (source: Cue, sourceNumber: number) => {
    try {
      await upsertCue({
        id: cue.id,
        transition: source.transition,
        mode: source.mode,
        activeFixtureGroupIds: source.activeFixtureGroupIds,
        selectableIds: source.selectableIds,
        overrides: source.overrides,
      });
      notifications.show({ title: `Copied cue ${sourceNumber}!`, message: "" });
    } catch {
      // error notif handled by api.ts
    }
  };

  // --- Active fixture groups ---------
  /** Switch.Group passes the whole new list of switched-on group ids, with the clicked one added or removed. */
  const onActiveFixtureGroupsChange = (activeFixtureGroupIds: string[]) =>
    void upsertCue({ id: cue.id, activeFixtureGroupIds }).catch(console.error);

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

  return (
    <div ref={cardRef} id={`cue-card-${cue.id}`} data-cursor-surface="cueCard" data-cursor-anchor={cue.id}>
      <CardBase isActive={isSelected} shadow={isSelected ? "lg" : "none"}>
        <Stack gap="md">
          <Group align="center" justify="space-between">
            <Group gap="xs">
              <Title
                order={4}
                style={{
                  backgroundColor: isSelected
                    ? "light-dark(var(--cue-color--light-selected), var(--cue-color--dark-selected))"
                    : "transparent",
                }}
              >
                Cue {cueNumber}
              </Title>
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
                  {copyOptions.length > 0 ? (
                    copyOptions.map((option) => (
                      <Menu.Item key={option.cue.id} onClick={() => void onCopyFrom(option.cue, option.number)}>
                        <Group>
                          Cue {option.number}
                          <Text c="dimmed" fz="sm">
                            {option.cue.id.slice(0, 4)}
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

              <Button variant="transparent" size="xs" onClick={onPreview}>
                Preview cue
              </Button>
            </Group>

            <ConfirmDeleteButton
              message={`Delete cue ${cueNumber}? This cannot be undone`}
              onConfirm={onDelete}
              buttonProps={{ variant: "transparent" }}
            />
          </Group>

          {/* Each group's Switch finds this through context: it is on when its id is in `activeFixtureGroupIds`. */}
          {/* The group wraps the grid, not the other way round: it renders its own wrapper element, which would */}
          {/* otherwise become the grid's only child. */}
          <Switch.Group value={cue.activeFixtureGroupIds} onChange={onActiveFixtureGroupsChange}>
            <SimpleGrid cols={2} spacing="md" verticalSpacing="md">
              {fixtureGroups.map((fixtureGroup) => (
                <CueCardFixtureGroupOptionSetPickers key={fixtureGroup.id} fixtureGroup={fixtureGroup} cue={cue} />
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
                      setSelectedCueId(cue.id);
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
          <Textarea
            label="Comments"
            minRows={1}
            maxRows={4}
            variant="unstyled"
            autosize
            value={comments}
            onChange={(e) => {
              setComments(e.currentTarget.value);
              saveComments(e.currentTarget.value);
            }}
            onBlur={() => saveComments.flush()}
            placeholder="Write any comments regarding this cue here..."
            styles={{ input: { fontSize: "16px" } }}
          />
        </Stack>
      </CardBase>
    </div>
  );
};

const CueCardFixtureGroupOptionSetPickers = ({ fixtureGroup, cue }: { fixtureGroup: FixtureGroup; cue: Cue }) => {
  const { optionSets } = useGetOptionSets(fixtureGroup.eventId, fixtureGroup.id);
  const disabled = !cue.activeFixtureGroupIds.includes(fixtureGroup.id); // duplicated in the picker

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
      }}
    >
      <Group>
        <Group gap="xs" align="center">
          <Text fw="bold">{fixtureGroup.name}</Text>
          <Tooltip label={fixtureGroup.description} position="top" withArrow>
            <IconInfoSquareRounded width="0.75rem" height="0.75rem" style={{ color: "var(--mantine-gray-5)" }} />
          </Tooltip>
        </Group>
        <Flex flex={1} />
        <Switch
          styles={{
            track: { cursor: "pointer" },
            input: { cursor: "pointer" },
          }}
          value={fixtureGroup.id}
          onLabel="ON"
          offLabel="OFF"
        />
      </Group>
      <Divider />
      {optionSets.map((optionSet) => (
        // Render the option set corresponding to the OptionSetType

        <OptionSetWrapper key={optionSet.id} optionSet={optionSet} eventId={fixtureGroup.eventId} cue={cue} />
      ))}
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
const OptionSetWrapper = ({ optionSet, eventId, cue }: { cue: Cue; optionSet: OptionSet; eventId: string }) => {
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

    void upsertCue({ id: cue.id, selectableIds: [...otherSelectableIds, ...newSelectedSelectableIds] }).catch(
      console.error,
    );
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
          <Button
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
          </Button>
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
};
