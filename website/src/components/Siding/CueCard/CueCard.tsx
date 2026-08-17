import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Collapse,
  Combobox,
  Fieldset,
  Flex,
  Group,
  Input,
  InputBase,
  Menu,
  MultiSelect,
  Popover,
  px,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Textarea,
  Title,
  Tooltip,
  useCombobox,
} from "@mantine/core";
import { CardBase } from "../CardBase";
import type { Cue } from "../../../types/cues";
import { useAppStore } from "../../../store/appStore";
import {
  AttributeTypes,
  BooleanOptions,
  type AttributeConfiguration,
  type ColourOption,
  type FixtureGroupConfiguration,
  type Item,
  type PositionOption,
} from "../../../types/types";
import { useQueryClient } from "@tanstack/react-query";
import { CustomTextInput } from "../../CustomTextInput/CustomTextInput";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { IconCaretDown, IconChevronUp } from "@tabler/icons-react";
import { useForm, type FormErrors, type UseFormReturnType } from "@mantine/form";
import { useDebouncedCallback } from "@mantine/hooks";
import { useUpdateCue } from "../../../query/useUpdateCue";
import { useDeleteCue } from "../../../query/useDeleteCue";
import { createDefaultValueAssignment, reconcileCueAssignments, removeCueFromRawLyrics } from "../../../utils/cueUtils";
import { useUpdateItem } from "../../../query/useUpdateItem";
import { notifications } from "../../../utils/notifications";

type FormData = Cue;

interface CueCardProps {
  cue: Cue;
  cueNumber: number;
  isCueSelected: boolean;
  fixtureGroups?: FixtureGroupConfiguration[];

  setOffset: React.Dispatch<React.SetStateAction<number>>; // translate the WHOLE cue cards up
}

const CueCardInternal = ({ cue, cueNumber, isCueSelected, fixtureGroups = [], setOffset }: CueCardProps) => {
  const queryClient = useQueryClient();
  const cueOrder = useAppStore((s) => s.cueOrder);
  const setSelectedCueId = useAppStore((s) => s.setCurrentlySelectedCueId);

  const { mutateAsync: updateCue } = useUpdateCue();
  const { mutateAsync: deleteCue } = useDeleteCue();
  const { mutate: updateItem } = useUpdateItem();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // --- Form ---------

  const initialValues: FormData = useMemo(
    () => ({
      id: cue.id,
      comments: cue.comments,
      createdAt: cue.createdAt,
      updatedAt: cue.updatedAt,
      deletedAt: cue.deletedAt,

      assignments: (cue && cue.assignments && Object.keys(cue.assignments).length != 0
        ? // TODO(editing): we need to figure out a way to reconcile the values:
          //                example: we add a new attribute when editing. However,
          //                because cue.assignments (which contains the old set of possible attribute & their assignments)
          //                doesn't have the new attributeId, we need to somehow add it in.
          reconcileCueAssignments(cue, fixtureGroups).assignments
        : Object.fromEntries(
            fixtureGroups.map((group) => [
              group.id,
              {
                name: group.name,
                assignment: Object.fromEntries(
                  group.attributes.map((attribute) => [
                    attribute.id,
                    {
                      name: attribute.name,
                      type: attribute.type,
                      value: createDefaultValueAssignment(attribute),
                      // value: {
                      //   // TODO: check `metadata` instead for default values
                      //   // [AttributeTypes.TEXT]: "",
                      //   // [AttributeTypes.SELECT]: "",
                      //   // [AttributeTypes.MULTISELECT]: [],
                      //   // [AttributeTypes.COLOUR]: { hex: "", name: "" },
                      //   // [AttributeTypes.SLIDER]: 0,
                      //   [AttributeTypes.BOOLEAN]:
                      //     attribute.optionPossibleValues[AttributeTypes.BOOLEAN] === "checkedDefault",
                      //   // [AttributeTypes.NONE]: null,
                      // },
                    },
                  ]),
                ),
              },
            ]),
          )) as any,
    }),
    [cue, fixtureGroups],
  );

  async function handleSave() {
    // first, validate the form
    const validationResult = form.validate();

    if (validationResult.hasErrors) {
      // notifications.show({
      //   title: "Cannot save cue",
      //   message: "Please fix the errors in the cue before saving.",
      // });
      return;
    }
    const activeItemId = useAppStore.getState().activeItemId;
    if (!activeItemId) return;
    try {
      // Remove all unncessary ValueAssignments from the attributes
      const formValues = form.getValues();
      Object.values(formValues.assignments).forEach((assignment) => {
        Object.values(assignment.assignment).forEach((attributeAssignment) => {
          const type = attributeAssignment.type;
          const value = attributeAssignment.value[type];

          // only keep that value
          attributeAssignment.value = { [type]: value };
        });
      });

      await updateCue({
        cueId: cue.id,
        itemId: activeItemId,
        requestBody: form.getValues(),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsDirty(false);
    }
  }

  const debouncedSave = useDebouncedCallback(() => {
    void handleSave();
  }, 500);

  const validateCue = (values: FormData): FormErrors => {
    const errors: FormErrors = {};

    for (const group of fixtureGroups) {
      for (const attribute of group.attributes) {
        if (!attribute.metadata.required) continue;

        const assignment = values.assignments[group.id]?.assignment[attribute.id];

        const value = assignment?.value[attribute.type];
        const isEmpty =
          value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
          const path = `assignments.${group.id}.assignment.${attribute.id}.value.${attribute.type}`;

          errors[path] = `${attribute.name} is required`;
        }
      }
    }

    return errors;
  };

  const form = useForm<FormData>({
    mode: "uncontrolled",
    initialValues,

    onValuesChange: () => {
      setIsDirty(true);
      debouncedSave();
    },

    validate: validateCue,
  });

  // --- Handle Cue cards translation up / down when clicked ---------

  const cueRef = useRef<HTMLDivElement>(null);

  const [translateDistance, setTranslateDistance] = useState<string>("0px");

  useEffect(() => {
    if (!isCueSelected || !cueRef.current) {
      setTranslateDistance("0px");
      return;
    }
    const elementId = `ref-${cue.id}`;
    const element = document.getElementById(elementId);
    if (!element) return;

    const targetTopY = element.offsetTop;
    const cardNaturalTopY = cueRef.current.offsetTop;

    console.log({
      targetTopY,
      cardNaturalTopY,
    });

    // 2.375rem convert to px
    const pxOffset = px("3.375rem");
    const deltaY = targetTopY - cardNaturalTopY - Number(pxOffset);

    // setTranslateDistance(`${deltaY}px`);
    // console.log("setting offset to ", deltaY);
    setOffset(deltaY);

    // return () => setOffset(0);
  }, [isCueSelected]);

  // This is required to set the z-index of the card that has the Combobox dropdown (colour select) open,
  // so that the dropdown is not hidden behind the next card.
  // this is a hack, see https://share.gemini.google/Od39OwKe7Hnw
  const [isAtLeastOneComboboxOpened, setAtLeastOneComboboxOpened] = useState<boolean>(false);

  const onJumpToCue = () => {
    setSelectedCueId(cue.id);

    const element = document.getElementById(`ref-${cue.id}`);
    if (!element) return;

    const y = element.getBoundingClientRect().top + window.scrollY - 128;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  // --- Handle initial save of cue if it has no assignments (a new cue) ---------

  // on the FIRST render, run a "save", so that the correct value assignments
  // are populated into the DB.
  // useEffect(() => {
  //   const needsInitialSave = !cue.assignments || Object.keys(cue.assignments).length === 0;
  //   if (!needsInitialSave) return;
  //   console.info("Cue not initialized, saving default values in DB");

  //   // Defer initial save to browser idle time so initial render and scrolling stay smooth
  //   const runSave = () => {
  //     // NOTE: Passing refetchItem / refetchCues here for now to ensure query sync,
  //     // but in the future we can save silently without refetching to prevent re-render cascades.
  //     handleSave();
  //   };

  //   if (typeof requestIdleCallback !== "undefined") {
  //     const handle = requestIdleCallback(runSave);
  //     return () => cancelIdleCallback(handle);
  //   } else {
  //     const timer = setTimeout(runSave, 100);
  //     return () => clearTimeout(timer);
  //   }
  // }, [cueRef]);

  // --- Deletion of cue ---------
  const [isDeletePopoverOpen, setDeletePopoverOpen] = useState(false);
  const handleDelete = async () => {
    try {
      const activeItemId = useAppStore.getState().activeItemId;
      const item = queryClient.getQueryData<Item>(["item", activeItemId]);
      if (!item) return;
      await deleteCue({ cueId: cue.id });
      const updatedRawLyrics = removeCueFromRawLyrics(item.rawLyrics, cue.id);

      // update Item to remove from rawlyrics
      // TODO @combine-updates: can probably calculate insertCueInRichContent in the backend, so we can save one query

      updateItem({
        itemId: item.id,
        requestBody: {
          rawLyrics: updatedRawLyrics,
        },
      });
    } catch (e) {
      console.error(e);
    }
  };

  // --- Copy cue ---------

  const onCopyCue = (cueId: string, fixtureGroupIds: string[], cueNumberCopied: number) => {
    const activeItemId = useAppStore.getState().activeItemId;
    const cues = queryClient.getQueryData<Cue[]>(["cues", activeItemId]);
    const cueToCopy = (cues || []).find((c) => c.id === cueId);
    if (cueToCopy) {
      const { id: _id, ...cueWithoutId } = cueToCopy;

      if (fixtureGroupIds.length > 0) {
        // only copy those specific assignments for those fixture groups
        cueWithoutId.assignments = Object.fromEntries(
          Object.entries(cueWithoutId.assignments).filter(([groupId]) => fixtureGroupIds.includes(groupId)),
        );

        // these assignments should override the current assignments in the form
        const currentAssigments = form.getValues().assignments;
        form.setValues({
          ...form.getValues(),
          assignments: {
            ...currentAssigments,
            ...cueWithoutId.assignments,
          },
        } as Partial<FormData>);

        notifications.show({
          title: `Copied cue ${cueNumberCopied}!`,
          message: ``,
        });
      } else {
        notifications.show({
          title: "No fixture groups selected",
          message: "At least one fixture group to copy must be selected ",
          color: "red",
        });
      }
    } else console.error("No such cue found!");
  };

  const [query, setQuery] = useState("");
  const [copyFixtureGroupIds, setCopyFixtureGroupIds] = useState<string[]>(fixtureGroups.map((group) => group.id));
  // ALWAYS map first, so we preserve the numbering of cues (Cue 1, cue 2, cue 3...)
  let cuesIdsOtherThanThisList = cueOrder
    .map((cueId, index) => ({ value: cueId, label: `Cue ${index + 1}` }))
    .filter((c) => c.value !== cue.id);
  if (query.length > 0) {
    // show the indexes-1 that match:
    //   search "1" --> show 0, 10,
    //   search "22" --> show 21,
    cuesIdsOtherThanThisList = cuesIdsOtherThanThisList.filter((cue) => cue.label.includes(query));
  }

  return (
    <form onSubmit={form.onSubmit(() => debouncedSave.flush())}>
      <div
        id={`cue-card-${cueNumber}`}
        ref={cueRef}
        style={{
          transform: `translateY(${translateDistance})`,
          transition: "all 0.3s ease",
          zIndex: isAtLeastOneComboboxOpened ? 100 : undefined, // DO NOT REMOVE
          position: "relative", // DO NOT REMOVE
          // marginTop: marginPushDownCue,
          // top: cueRefTop + 100,
        }}
      >
        <CardBase isActive={isCueSelected} shadow={isCueSelected ? "lg" : "none"}>
          <Stack gap={0}>
            <Group mb="md">
              <Title
                order={4}
                style={{
                  backgroundColor: isCueSelected ? "light-dark(yellow, var(--mantine-color-yellow-9))" : "transparent",
                }}
              >
                {" "}
                Cue {cueNumber}
              </Title>
              <Tooltip label={`Cue ID: ${cue.id}`}>
                <Text c="dimmed" style={{ textDecoration: "underline dotted" }}>
                  {cue.id.slice(0, 4)}
                </Text>
              </Tooltip>
              {isCueSelected ? (
                <Button size="xs" variant="light" onClick={() => setSelectedCueId(undefined)}>
                  Reset view
                </Button>
              ) : (
                <Button
                  variant="transparent"
                  size="xs"

                  onClick={() => onJumpToCue()}
                >
                  Scroll to cue
                </Button>
              )}

              {/* <Button
                variant="transparent"
                size="xs"
                // style={{
                //   textDecoration: "underline dotted",
                // }}
                color="black"
                onClick={open}
              >
                Copy another cue
              </Button> */}

              <Menu shadow="md">
                <Menu.Target>
                  <Button
                    variant="transparent"
                    size="xs"
                    // style={{
                    //   textDecoration: "underline dotted",
                    // }}
                    // onClick={open}
                  >
                    Copy another cue
                  </Button>
                </Menu.Target>
                <Menu.Dropdown mah={300} style={{ overflowY: "auto" }}>
                  <Menu.Search
                    value={query}
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    placeholder="Search cues"
                  />
                  <Menu.Label>Copy settings for:</Menu.Label>
                  <Menu.CheckboxGroup value={copyFixtureGroupIds} onChange={setCopyFixtureGroupIds}>
                    {fixtureGroups.map((group) => (
                      <Menu.CheckboxItem key={group.id} value={group.id}>
                        {group.name}
                      </Menu.CheckboxItem>
                    ))}
                  </Menu.CheckboxGroup>
                  <Menu.Divider />
                  {cuesIdsOtherThanThisList.length > 0 ? (
                    cuesIdsOtherThanThisList.map((cue) => (
                      <Menu.Item
                        key={cue.value}
                        onClick={() => onCopyCue(cue.value, copyFixtureGroupIds, Number(cue.label.split(" ")[1]))}
                      >
                        <Group>
                          {cue.label}
                          <Text c="dimmed" fz="sm">
                            {" "}
                            {cue.value.slice(0, 4)}{" "}
                          </Text>
                        </Group>
                      </Menu.Item>
                    ))
                  ) : (
                    <Menu.Item>
                      <Text c="dimmed" size="sm" ta="center" py="xs">
                        No cues found
                      </Text>
                    </Menu.Item>
                  )}
                </Menu.Dropdown>
              </Menu>

              <Box flex={1}>{/* <Text>{simplifyCues(cue)}</Text> */}</Box>
              <Popover
                shadow="sm"
                withArrow
                position="top"
                withOverlay
                opened={isDeletePopoverOpen}
                trapFocus
                onDismiss={() => setDeletePopoverOpen(false)}
              >
                <Popover.Target>
                  <Button color="red" size="xs" variant="transparent" onClick={() => setDeletePopoverOpen(true)}>
                    Delete{" "}
                  </Button>
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack>
                    <Text> Are you sure you want to delete this cue?</Text>
                    <Flex justify={"end"} gap="sm">
                      <Button
                        data-autofocus
                        variant="transparent"
                        color="black"
                        onClick={() => setDeletePopoverOpen(false)}
                        size="xs"
                      >
                        Cancel
                      </Button>
                      <Button color="red" size="xs" variant="light" onClick={handleDelete}>
                        Delete
                      </Button>
                    </Flex>
                  </Stack>
                </Popover.Dropdown>
              </Popover>

              <Tooltip label={isDirty ? "Save changes" : "Changes autosaved!"}>
                <Button variant="light" size="xs" disabled={!isDirty} type="submit">
                  {" "}
                  Save changes{" "}
                </Button>
              </Tooltip>
              <ActionIcon variant="light" color="gray" onClick={() => setIsCollapsed((s) => !s)}>
                <IconChevronUp
                  style={{
                    transition: "transform 0.2s",
                    transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                  width={"1rem"}
                />
              </ActionIcon>
            </Group>

            <Collapse expanded={!isCollapsed}>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="md">
                {fixtureGroups.map((group, index) => (
                  <FixtureGroupSection
                    key={group.id}
                    group={group}
                    index={index + 1}
                    form={form}
                    setIsAtLeastOneComboboxOpened={setAtLeastOneComboboxOpened}
                  />
                ))}
              </SimpleGrid>
            </Collapse>
            <Stack>
              {/* <Collapse expanded={isCollapsed}>
                <Text>{generateOneLineCue(cue)}</Text>
              </Collapse> */}
              <Textarea
                ml="xs"
                label="Comments"
                minRows={1}
                variant="unstyled"
                autosize
                maxRows={4}
                name="comments"
                key={form.key("comments")}
                {...form.getInputProps("comments")}
                placeholder="Write any comments regarding this cue here..."
                styles={{
                  input: { fontSize: "16px" }, // Or use rem units like '1.25rem'
                }}
              />
            </Stack>
          </Stack>
        </CardBase>
      </div>
    </form>
  );
};

const FixtureGroupSection = ({
  group,
  index,
  form,

  setIsAtLeastOneComboboxOpened,
}: {
  group: FixtureGroupConfiguration;
  index: number;
  form: UseFormReturnType<FormData>;

  setIsAtLeastOneComboboxOpened: (value: boolean) => void;
}) => {
  // Configure the FormData to include this FixtureGroup.
  // Only on init.
  // useEffect(() => {
  //   // assignments[group.id] = {}
  //   form.setFieldValue(`assignments.${group.id}`, { name: group.name, assignment: {} });
  //   console.log(`set field assignment assignments.${group.id}`, form.getValues());

  //   return () => form.setFieldValue(`assignments.${group.id}`, undefined);
  // }, []);

  return (
    <Fieldset
      legend={`Group ${index}: ${group.name}`}
      style={{
        backgroundColor: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))",
        // backgroundClip
      }}
    >
      <Stack gap="xs">
        {group.attributes.map((attr, attrIndex) => (
          <AttributeDisplay
            groupId={group.id}
            form={form}
            key={attrIndex}
            attribute={attr}
            index={attrIndex}
            setIsAtLeastOneComboboxOpened={setIsAtLeastOneComboboxOpened}
          />
        ))}
      </Stack>
    </Fieldset>
  );
};

const AttributeDisplay = ({
  attribute,
  index: _index,
  form,
  groupId,

  setIsAtLeastOneComboboxOpened,
}: {
  attribute: AttributeConfiguration;
  index: number;
  form: UseFormReturnType<FormData>;
  groupId: string;

  setIsAtLeastOneComboboxOpened: (value: boolean) => void;
}) => {
  const { name, type, optionPossibleValues } = attribute;

  // Configure the FormData to include this Attribute.
  // Only on init.
  // useEffect(() => {
  //   // assignments[group.id] = { [attribute.id] = { }}
  //   console.log(`set field assignment assignments.${groupId}.${attribute.id}`, form.getValues());

  //   // If I'm being honest, I'm not entirely sure why this is needed/
  //   // It's not needed in the equivalent section for Adding, where the same method is used.
  //   // If this is removed, the following setFieldValue throws an error saying that `assignments.groupId` is undefined,
  //   // even though it's clearly set in the parent component.
  //   // if (!form.getValues()["assignments"][groupId]) {
  //   //   form.setFieldValue(`assignments.${groupId}`, {
  //   //     assignment: {},
  //   //     name: "it broke",
  //   //   });
  //   // }
  //   form.setFieldValue(`assignments.${groupId}.assignment.${attribute.id}`, {
  //     name: attribute.name,
  //     type: attribute.type,
  //     value: {
  //       [AttributeTypes.SELECT]: "",
  //       [AttributeTypes.MULTISELECT]: [],

  //       // TODO: check how colour works
  //       [AttributeTypes.COLOUR]: { hex: "", name: "" },
  //       [AttributeTypes.SLIDER]: 0,
  //       [AttributeTypes.BOOLEAN]: false,
  //       [AttributeTypes.TEXT]: null,
  //       [AttributeTypes.NONE]: null,
  //     },
  //   });

  //   return () => form.setFieldValue(`assignments.${groupId}.assignment.${attribute.id}`, undefined);
  // }, []);

  const baseFieldName = `assignments.${groupId}.assignment.${attribute.id}.value`;

  switch (type) {
    case AttributeTypes.TEXT:
      return (
        <CustomTextInput
          variant="default"
          label={name}
          placeholder={attribute.metadata.placeholder ?? `Input ${name}`}
          name={`${baseFieldName}.${AttributeTypes.TEXT}`}
          key={form.key(`${baseFieldName}.${AttributeTypes.TEXT}`)}
          {...form.getInputProps(`${baseFieldName}.${AttributeTypes.TEXT}`)}
          required={attribute.metadata.required}
        />
      );

    case AttributeTypes.SELECT:
      return (
        <Select
          comboboxProps={{ transitionProps: { transition: "pop", duration: 100 } }}
          searchable
          label={name}
          data={optionPossibleValues[AttributeTypes.SELECT]}
          placeholder={attribute.metadata.placeholder ?? `Pick a value`}
          name={`${baseFieldName}.${AttributeTypes.SELECT}`}
          key={form.key(`${baseFieldName}.${AttributeTypes.SELECT}`)}
          {...form.getInputProps(`${baseFieldName}.${AttributeTypes.SELECT}`)}
          clearable
          rightSection={<IconCaretDown width={"0.75rem"} />}
          clearSectionMode="clear"
          required={attribute.metadata.required}
        />
      );

    case AttributeTypes.MULTISELECT:
      return (
        <MultiSelect
          searchable
          label={name}
          data={optionPossibleValues[AttributeTypes.MULTISELECT]}
          placeholder={attribute.metadata.placeholder ?? `Pick one or more values`}
          name={`${baseFieldName}.${AttributeTypes.MULTISELECT}`}
          key={form.key(`${baseFieldName}.${AttributeTypes.MULTISELECT}`)}
          {...form.getInputProps(`${baseFieldName}.${AttributeTypes.MULTISELECT}`)}
          required={attribute.metadata.required}
        />
      );

    case AttributeTypes.COLOUR:
      return (
        <ColourSelect
          fieldName={`${baseFieldName}.${AttributeTypes.COLOUR}`}
          form={form}
          name={name}
          colourOptions={optionPossibleValues[AttributeTypes.COLOUR] || []}
          defaultValue={
            form.getInitialValues().assignments[groupId].assignment?.[attribute.id]?.value[AttributeTypes.COLOUR]
          }
          setIsAtLeastOneComboboxOpened={setIsAtLeastOneComboboxOpened}
          required={attribute.metadata.required}
        />
      );

    case AttributeTypes.PRESET_COLOUR:
      return (
        <ColourSelect
          fieldName={`${baseFieldName}.${AttributeTypes.PRESET_COLOUR}`}
          form={form}
          name={name}
          colourOptions={optionPossibleValues[AttributeTypes.PRESET_COLOUR] || []}
          defaultValue={
            form.getInitialValues().assignments[groupId].assignment?.[attribute.id]?.value[AttributeTypes.PRESET_COLOUR]
          }
          setIsAtLeastOneComboboxOpened={setIsAtLeastOneComboboxOpened}
          required={attribute.metadata.required}
        />
      );

    case AttributeTypes.BOOLEAN:
      return (
        <BooleanSelect
          name={name}
          fieldName={`${baseFieldName}.${AttributeTypes.BOOLEAN}`}
          form={form}
          defaultValue={optionPossibleValues[AttributeTypes.BOOLEAN]!}
          required={attribute.metadata.required}
        />
      );

    case AttributeTypes.SLIDER_PRESETS:
      return (
        <SliderPresetInput
          name={name}
          fieldName={`${baseFieldName}.${AttributeTypes.SLIDER_PRESETS}`}
          form={form}
          marks={optionPossibleValues[AttributeTypes.SLIDER_PRESETS]!}
          required={attribute.metadata.required}
        />
      );

    case AttributeTypes.PRESET_INTENSITY:
      return (
        <SliderPresetInput
          name={name}
          fieldName={`${baseFieldName}.${AttributeTypes.PRESET_INTENSITY}`}
          form={form}
          marks={optionPossibleValues[AttributeTypes.PRESET_INTENSITY]!}
          required={attribute.metadata.required}
        />
      );

    case AttributeTypes.PRESET_POSITION:
      return (
        <PositionSelect
          name={name}
          fieldName={`${baseFieldName}.${AttributeTypes.PRESET_POSITION}`}
          form={form}
          positionOptions={optionPossibleValues[AttributeTypes.PRESET_POSITION] ?? []}
          placeholder={attribute.metadata.placeholder ?? `Pick a value`}
          required={attribute.metadata.required}
        />
      );
  }
  return <CustomTextInput label={attribute.name}></CustomTextInput>;
};

function ColourSelect({
  colourOptions,
  name,
  fieldName,
  form,
  defaultValue,
  required = false,

  setIsAtLeastOneComboboxOpened,
}: {
  name: string;
  colourOptions: ColourOption[];
  fieldName: string;
  form: UseFormReturnType<FormData>;
  defaultValue?: ColourOption;
  required?: boolean;

  setIsAtLeastOneComboboxOpened: (value: boolean) => void;
}) {
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setIsAtLeastOneComboboxOpened(false);
    },
    onDropdownOpen: () => setIsAtLeastOneComboboxOpened(true),
  });

  // `search` is transient UI state — it controls the input text for dropdown filtering.
  // The actual committed value (a ColourOption object) lives in the form.
  const [search, setSearch] = useState(defaultValue?.name || "");

  const formPath = `${fieldName}` as const;

  const shouldFilterOptions = colourOptions.every((item) => item.hex !== search);
  const filteredOptions = shouldFilterOptions
    ? colourOptions.filter((item) => item.name.toLowerCase().includes(search.toLowerCase().trim()))
    : colourOptions;

  const options = filteredOptions.map((item) => (
    <Combobox.Option value={item.name} key={item.hex}>
      <ColourSelectOption {...item} />
    </Combobox.Option>
  ));

  // watch the saved value
  // @ts-ignore
  form.watch(formPath, ({ value }: { value: ColourOption }) => {
    if (value) {
      setSearch(value.name); // always sync
    }
  });

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(val) => {
        // Find the full ColourOption so we store { hex, name } in the form — not just the name string.
        const selected = colourOptions.find((item) => item.name === val);
        form.setFieldValue(formPath, selected ?? { name: val, hex: "" });
        setSearch(val);
        combobox.closeDropdown();
      }}
      styles={{
        dropdown: {
          zIndex: 99,
        },
      }}
    >
      <Combobox.Target targetType="input">
        <div>
          <InputBase
            required={required}
            label={name}
            rightSection={<Combobox.Chevron />}
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
              // Restore display to whatever the form currently holds (in case the user typed but didn't select).
              const committed = formPath
                .split(".")
                .reduce((cur: any, key) => (cur ? cur[key] : undefined), form.getValues() as any) as
                ColourOption | undefined;

              // const committed = form.getValues()[formPath.[0]][] as ColourOption | undefined;
              setSearch(committed?.name ?? "");
            }}
            placeholder="Search value"
            rightSectionPointerEvents="none"
            leftSection={
              <Box
                style={{
                  width: "1rem",
                  height: "1rem",
                  borderRadius: "4px",
                  backgroundColor: (
                    formPath
                      .split(".")
                      .reduce((cur: any, key) => (cur ? cur[key] : undefined), form.getValues() as any) as
                      ColourOption | undefined
                  )?.hex,

                  border:
                    (
                      formPath
                        .split(".")
                        .reduce((cur: any, key) => (cur ? cur[key] : undefined), form.getValues() as any) as
                        ColourOption | undefined
                    )?.hex === "#ffffff"
                      ? "2px solid light-dark(black, transparent)"
                      : "",
                }}
              />
            }
          />
          <Button
            size="xs"
            variant="transparent"
            color="gray"
            onClick={() => {
              setSearch("");

              // clear the form
              form.setFieldValue(formPath, { hex: "", name: "" });
            }}
          >
            Clear
          </Button>
        </div>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {options.length > 0 ? options : <Combobox.Empty>Nothing found</Combobox.Empty>}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

function ColourSelectOption({ hex, name }: ColourOption) {
  return (
    <Group>
      <Box
        style={{
          backgroundColor: hex,

          border: hex === "#ffffff" ? "2px solid light-dark(black, transparent)" : "",
          width: "20px",
          height: "20px",
          borderRadius: "4px",
        }}
      />
      <Text>{name}</Text>
    </Group>
  );
}

function BooleanSelect({
  name,
  fieldName,
  form,
  required = false,
}: {
  defaultValue: BooleanOptions;
  name: string;
  fieldName: string;
  required?: boolean;
  form: UseFormReturnType<FormData>;
}) {
  return (
    <Checkbox
      required={required}
      label={name}
      key={form.key(fieldName)}
      {...form.getInputProps(fieldName, { type: "checkbox" })}
    />
  );
}

function PositionSelect({
  name,
  fieldName,
  form,
  positionOptions,
  placeholder,
  required = false,
}: {
  name: string;
  fieldName: string;
  form: UseFormReturnType<FormData>;
  positionOptions: PositionOption[];
  placeholder: string;
  required?: boolean;
}) {
  const inputProps = form.getInputProps(fieldName);
  const initialPosition = inputProps.defaultValue as PositionOption | undefined;

  console.log({ initialPosition });
  const initialPositionIndex = initialPosition
    ? positionOptions.findIndex(
        (position) =>
          position.pan === initialPosition.pan &&
          position.tilt === initialPosition.tilt &&
          position.name === initialPosition.name,
      )
    : -1;

  return (
    <Select
      comboboxProps={{ transitionProps: { transition: "pop", duration: 100 } }}
      searchable
      label={name}
      data={positionOptions.map((position, index) => ({
        // Mantine requires every Select value to be unique. Position values are not unique domain IDs.
        value: String(index),
        label: position.name,
      }))}
      placeholder={placeholder}
      name={fieldName}
      key={form.key(fieldName)}
      defaultValue={initialPositionIndex >= 0 ? String(initialPositionIndex) : null}
      onChange={(value) => {
        const selectedPosition = value === null ? undefined : positionOptions[Number(value)];
        form.setFieldValue(fieldName, selectedPosition ? { ...selectedPosition } : undefined);
      }}
      onBlur={inputProps.onBlur}
      error={inputProps.error}
      clearable
      rightSection={<IconCaretDown width={"0.75rem"} />}
      clearSectionMode="clear"
      required={required}
    />
  );
}

function SliderPresetInput({
  name,
  fieldName,
  form,
  marks,
  required = false,
}: {
  name: string;
  fieldName: string;
  form: UseFormReturnType<FormData>;
  marks: number[];
  required?: boolean;
}) {
  console.log({ name });
  // validation: if no marks, return nothing
  if (!marks || marks.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        {" "}
        No values available for selection{" "}
      </Text>
    );
  }
  return (
    <Input.Wrapper label={name} required={required}>
      <Slider
        key={form.key(fieldName)}
        {...form.getInputProps(fieldName)}
        mb="md"
        restrictToMarks
        marks={marks.map((mark) => ({ value: mark, label: mark.toString() }))}
      />
    </Input.Wrapper>
  );
}

// re-render if cue.updatedAt is different OR isCueSelected is false
export const CueCard = React.memo(CueCardInternal);
