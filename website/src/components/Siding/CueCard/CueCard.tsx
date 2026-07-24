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
  Select,
  SimpleGrid,
  Stack,
  Text,
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
} from "../../../types/types";
import { CustomTextInput } from "../../CustomTextInput/CustomTextInput";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { IconChevronUp } from "@tabler/icons-react";
import { useForm, type UseFormReturnType } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useGetEvent } from "../../../query/useGetEvent";
import { useGetCues } from "../../../query/useGetCues";
import { useGetItem } from "../../../query/useGetItem";

type FormData = Cue;

const CueCardInternal = ({
  cue,
  cueNumber,
  isCueSelected,
}: {
  cue: Cue;
  cueNumber: number;
  isCueSelected: boolean;
}) => {
  const code = useAppStore((s) => s.code);
  const activeItemId = useAppStore((s) => s.activeItemId);
  const { event } = useGetEvent({ code });

  const { item, cueOrder, refetchItem } = useGetItem({ eventId: event?.id, itemId: activeItemId });
  const { refetchCues, cues } = useGetCues({ eventId: event?.id, itemId: activeItemId });

  const onDeleteCue = useAppStore((s) => s.onDeleteCue);
  const onUpdateCue = useAppStore((s) => s.onUpdateCue);
  // const currrentlySelectedCueId = useAppStore((s) => s.currentlySelectedCueId);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [opened, { open, close }] = useDisclosure(false);
  const fixtureGroups = event?.fixtureGroups ?? [];

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

    onValuesChange: (v) => {
      console.log(v);

      setIsDirty(true);
    },
  });

  console.log("cuecard rendering");

  const cueRef = useRef<HTMLDivElement>(null);

  const [translateDistance, setTranslateDistance] = useState<string>("0px");

  useEffect(() => {
    // Get the reference element's offset-X value
    if (!isCueSelected || !cueRef.current) {
      setTranslateDistance("0px");
      return;
    }
    const elementId = `ref-${cue.id}`;
    const element = document.getElementById(elementId);
    if (!element) return;
    const { offsetTop } = element;
    console.log({ offsetTop });

    const thisElementOffsetTop = cueRef.current?.offsetTop ?? 0;
    console.log({ thisElementOffsetTop });

    const translateDistance = offsetTop - thisElementOffsetTop;
    const thisElementHeight = cueRef.current?.offsetHeight ?? 0;

    setTranslateDistance((translateDistance - thisElementHeight / 2).toString() + "px");
  }, [isCueSelected]);

  // on the FIRST render, run a "save", so that the correct value assignments
  // are populated into the DB.
  useEffect(() => {
    const needsInitialSave = !cue.assignments || Object.keys(cue.assignments).length === 0;
    if (!needsInitialSave || !event?.id) return;

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
  }, []);

  const handleSave = async () => {
    try {
      console.log(form.getValues(), "--------------------");
      // convert the form value to API request body
      await onUpdateCue(form.getValues(), event, refetchItem, refetchCues);

      // transform empty strings to NULLs.
      // because postgres will reject empty strings for VARCHAR
    } catch (e) {
    } finally {
      setIsDirty(false);
    }
  };

  const beforeDeleteCue = (cue: Cue) => {
    const result = confirm("Are you sure you want to delete this cue?");
    if (result) {
      onDeleteCue(cue.id, item?.rawLyrics ?? "", event, refetchItem, refetchCues);
    }
  };

  const onCopyCue = (cueId: string) => {
    const cueToCopy = (cues || []).find((c) => c.id === cueId);
    if (cueToCopy) {
      console.log({ cue: cueToCopy });
      const { id: _, ...cueWithoutId } = cueToCopy;
      form.setValues(cueWithoutId as Partial<FormData>);
      close();
    } else console.error("No such cue found!");
  };

  return (
    <form onSubmit={form.onSubmit((_) => handleSave())}>
      <div
        ref={cueRef}
        style={{
          transform: `translateY(${translateDistance})`,
          transition: "all 0.3s ease",
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
              <Title order={4}> Cue {cueNumber} </Title>
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
              <Button color="red" size="xs" variant="transparent" onClick={() => beforeDeleteCue(cue)}>
                Delete{" "}
              </Button>
              <Button color="orange" size="xs" disabled={!isDirty} type="submit">
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
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                {fixtureGroups.map((group, index) => (
                  <FixtureGroupSection key={group.id} group={group} index={index + 1} form={form} />
                ))}
              </SimpleGrid>
            </Collapse>
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
}: {
  group: FixtureGroupConfiguration;
  index: number;
  form: UseFormReturnType<FormData>;
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
          <AttributeDisplay groupId={group.id} form={form} key={attrIndex} attribute={attr} index={attrIndex} />
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
}: {
  attribute: AttributeConfiguration;
  index: number;
  form: UseFormReturnType<FormData>;
  groupId: string;
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
}: {
  name: string;
  colourOptions: ColourOption[];
  fieldName: string;
  form: UseFormReturnType<FormData>;
  defaultValue: ColourOption;
}) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  // `search` is transient UI state — it controls the input text for dropdown filtering.
  // The actual committed value (a ColourOption object) lives in the form.
  const [search, setSearch] = useState(defaultValue.name);

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

  useEffect(() => {
    // ONLY on mount, update the search
    // This case is applicable when the user has a
    // saved cue, and because this component is not controlled,
    // we need to manually set the "default" value loaded from database
  }, []);

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
    >
      <Combobox.Target>
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
