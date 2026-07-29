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
  InputBase,
  Modal,
  MultiSelect,
  px,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
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
} from "../../../types/types";
import { useQueryClient } from "@tanstack/react-query";
import { CustomTextInput } from "../../CustomTextInput/CustomTextInput";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { IconCaretDown, IconChevronUp } from "@tabler/icons-react";
import { useForm, type UseFormReturnType } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useUpdateCue } from "../../../query/useUpdateCue";
import { useDeleteCue } from "../../../query/useDeleteCue";
import { removeCueFromRawLyrics } from "../../../utils/cueUtils";
import { useUpdateItem } from "../../../query/useUpdateItem";

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

  const [opened, { open, close }] = useDisclosure(false);

  const [selectedCopyCue, setSelectedCopyCue] = useState<string>("");

  const initialValues: FormData = useMemo(
    () => ({
      id: cue.id,
      comments: cue.comments,
      createdAt: cue.createdAt,
      updatedAt: cue.updatedAt,
      deletedAt: cue.deletedAt,

      assignments: (cue && cue.assignments && Object.keys(cue.assignments).length != 0
        ? cue.assignments
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
                      value: {
                        [AttributeTypes.TEXT]: "",
                        [AttributeTypes.SELECT]: "",
                        [AttributeTypes.MULTISELECT]: [],
                        [AttributeTypes.COLOUR]: { hex: "", name: "" },
                        [AttributeTypes.SLIDER]: 0,
                        [AttributeTypes.BOOLEAN]: false,
                        [AttributeTypes.NONE]: null,
                      },
                    },
                  ]),
                ),
              },
            ]),
          )) as any,
    }),
    [cue, fixtureGroups],
  );
  const form = useForm<FormData>({
    mode: "uncontrolled",
    initialValues,

    onValuesChange: () => {
      setIsDirty(true);
    },
  });

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

  // const [marginPushDownCue, setMarginPushDownCue] = useState<string>("0px");
  // const [cueRefTop, setCueRefTop] = useState<number>(0);
  // useEffect(() => {
  //   // get the inserted cue's top Y-height
  //   // get this cue's top Y-height
  //   // if this cue's Y-height is MORE than the inserted cue's Y-height,
  //   //   set the marginTop to 0px (we accept a card that's lower than expected)
  //   // if this cue's Y-height is LESS THAN or EQUAL TO the inserted cue's Y-height,
  //   //   then
  //   //     (safety check: TODO)
  //   //   then calculate the margin: `cueYheight - thisYTop`
  //   //   set the marginTop to that value

  //   if (!cueRef.current) return;
  //   if (isCueSelected) return; // ignore from layout
  //   const cardRect = cueRef.current.getBoundingClientRect();

  //   // let marginsSoFar = 0;
  //   // for (let i = 0; i < cueNumber - 1; i++) {
  //   //   const elementId = `ref-${cueOrder[i]}`; // x
  //   //   const element = document.getElementById(elementId);
  //   //   const cueCardId = `cue-card-${i + 1}`; // y
  //   //   const cueCardElement = document.getElementById(cueCardId);

  //   //   if (!element || !cueCardElement) return;

  //   //   const delta = element.getBoundingClientRect().top - cueCardElement.getBoundingClientRect().top;
  //   //   if (delta > 0) marginsSoFar += delta;
  //   //   // calculate the offset btwn this elementTop and the targetTop
  //   // }

  //   const elementId = `ref-${cue.id}`;
  //   const element = document.getElementById(elementId);
  //   if (!element) return;

  //   const targetRect = element.getBoundingClientRect();

  //   // const currentTranslateY = parseFloat(translateDistance) || 0;

  //   const targetTopY = targetRect.top + window.scrollY;
  //   const cardNaturalTopY = cardRect.top + window.scrollY;

  //   const deltaY = targetTopY - cardNaturalTopY;

  //   console.log({ element, offset: element.offsetTop });

  //   // setCueRefTop(cardNaturalTopY)

  //   // if (deltaY < 0) return;
  //   // setMarginPushDownCue(`${deltaY}px`);

  //   // get the top: relative to the cuelist
  //   setCueRefTop(element.offsetTop);
  // }, [cueOrder, opened, isCueSelected, cueNumber]);

  // on the FIRST render, run a "save", so that the correct value assignments
  // are populated into the DB.
  useEffect(() => {
    const needsInitialSave = !cue.assignments || Object.keys(cue.assignments).length === 0;
    if (!needsInitialSave) return;
    console.info("Cue not initialized, saving default values in DB");

    // Defer initial save to browser idle time so initial render and scrolling stay smooth
    const runSave = () => {
      // NOTE: Passing refetchItem / refetchCues here for now to ensure query sync,
      // but in the future we can save silently without refetching to prevent re-render cascades.
      handleSave();
    };

    if (typeof requestIdleCallback !== "undefined") {
      const handle = requestIdleCallback(runSave);
      return () => cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(runSave, 100);
      return () => clearTimeout(timer);
    }
  }, [cueRef]);

  const onJumpToCue = () => {
    setSelectedCueId(cue.id);

    const element = document.getElementById(`ref-${cue.id}`);
    if (!element) return;

    const y = element.getBoundingClientRect().top + window.scrollY - 128;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const handleSave = async () => {
    const activeItemId = useAppStore.getState().activeItemId;
    if (!activeItemId) return;
    try {
      // convert the form value to API request body
      // await onUpdateCue(form.getValues(), refetchItem, refetchCues);

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
  };

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

  const beforeDeleteCue = () => {
    const result = confirm("Are you sure you want to delete this cue?");
    if (result) {
      handleDelete();
    }
  };

  const onCopyCue = (cueId: string) => {
    const activeItemId = useAppStore.getState().activeItemId;
    const cues = queryClient.getQueryData<Cue[]>(["cues", activeItemId]);
    const cueToCopy = (cues || []).find((c) => c.id === cueId);
    if (cueToCopy) {
      const { id: _id, ...cueWithoutId } = cueToCopy;
      form.setValues(cueWithoutId as Partial<FormData>);
      close();
    } else console.error("No such cue found!");
  };

  return (
    <form onSubmit={form.onSubmit((_) => handleSave())}>
      <div
        id={`cue-card-${cueNumber}`}
        ref={cueRef}
        style={{
          transform: `translateY(${translateDistance})`,
          transition: "all 0.3s ease",
          zIndex: isCueSelected || isAtLeastOneComboboxOpened ? 100 : undefined,
          // position: "relative",
          // marginTop: marginPushDownCue,
          // top: cueRefTop + 100,
        }}
      >
        <CardBase isActive={false} shadow={isCueSelected ? "lg" : "none"}>
          <Modal opened={opened} onClose={close} title={`Copy a cue to cue ${cueNumber}`} centered>
            <Stack>
              <Select
                value={selectedCopyCue}
                onChange={(value) => setSelectedCopyCue(value ?? "")}
                data={cueOrder
                  .map((cId) => (cId !== cue.id ? cId : ""))

                  .map((cueId, index) => ({ value: cueId, label: `Cue ${index + 1}` }))
                  .filter((opt) => opt.value !== "")}
              />
              <Flex justify={"end"}>
                <Button onClick={() => onCopyCue(selectedCopyCue)}> Copy </Button>
              </Flex>
            </Stack>
          </Modal>
          <Stack gap={0}>
            <Group mb="md">
              <Title order={4} style={{ backgroundColor: isCueSelected ? "yellow" : "transparent" }}>
                {" "}
                Cue {cueNumber}{" "}
              </Title>
              <Button variant="transparent" size="xs" color="black" onClick={() => onJumpToCue()}>
                Scroll to cue
              </Button>
              <Button
                variant="transparent"
                size="xs"
                // style={{
                //   textDecoration: "underline dotted",
                // }}
                color="black"
                onClick={open}
              >
                Copy another cue
              </Button>
              <Box flex={1}>{/* <Text>{simplifyCues(cue)}</Text> */}</Box>
              <Button color="red" size="xs" variant="transparent" onClick={beforeDeleteCue}>
                Delete{" "}
              </Button>
              <Button variant="light" size="xs" disabled={!isDirty} type="submit">
                {" "}
                Save changes{" "}
              </Button>
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
    <Fieldset legend={`Group ${index}: ${group.name}`}>
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
        />
      );

    case AttributeTypes.SELECT:
      return (
        <Select
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
        />
      );

    case AttributeTypes.COLOUR:
      return (
        <ColourSelect
          fieldName={`${baseFieldName}.${AttributeTypes.COLOUR}`}
          form={form}
          name={name}
          colourOptions={optionPossibleValues[AttributeTypes.COLOUR]}
          defaultValue={
            form.getInitialValues().assignments[groupId].assignment[attribute.id].value[AttributeTypes.COLOUR]
          }
          setIsAtLeastOneComboboxOpened={setIsAtLeastOneComboboxOpened}
        />
      );

    case AttributeTypes.BOOLEAN:
      return (
        <BooleanSelect
          name={name}
          fieldName={`${baseFieldName}.${AttributeTypes.BOOLEAN}`}
          form={form}
          defaultValue={optionPossibleValues[AttributeTypes.BOOLEAN]}
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

  setIsAtLeastOneComboboxOpened,
}: {
  name: string;
  colourOptions: ColourOption[];
  fieldName: string;
  form: UseFormReturnType<FormData>;
  defaultValue: ColourOption;

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
                | ColourOption
                | undefined;

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
                      | ColourOption
                      | undefined
                  )?.hex,

                  // TODO @nightmode
                  border:
                    (
                      formPath
                        .split(".")
                        .reduce((cur: any, key) => (cur ? cur[key] : undefined), form.getValues() as any) as
                        | ColourOption
                        | undefined
                    )?.hex === "#ffffff"
                      ? "2px solid black"
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

          // TODO @nightmode
          border: hex === "#ffffff" ? "2px solid black" : "",
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
}: {
  defaultValue: BooleanOptions;
  name: string;
  fieldName: string;
  form: UseFormReturnType<FormData>;
}) {
  return <Checkbox label={name} key={form.key(fieldName)} {...form.getInputProps(fieldName, { type: "checkbox" })} />;
}

// re-render if cue.updatedAt is different OR isCueSelected is false
export const CueCard = React.memo(CueCardInternal);
