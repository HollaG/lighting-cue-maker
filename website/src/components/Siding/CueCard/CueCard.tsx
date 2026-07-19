import {
  Accordion,
  ActionIcon,
  Box,
  Button,
  Card,
  Checkbox,
  Collapse,
  Combobox,
  Fieldset,
  Group,
  Input,
  InputBase,
  MultiSelect,
  Select,
  SimpleGrid,
  Space,
  Stack,
  Text,
  Title,
  useCombobox,
} from "@mantine/core";
import { CardBase } from "../CardBase";
import type { Cue } from "../../../types/cues";
import { useAppContext } from "../../../context/AppContext";
import {
  AttributeTypes,
  BooleanOptions,
  type AttributeConfiguration,
  type ColourOption,
  type FixtureGroupConfiguration,
} from "../../../types/types";
import { CustomTextInput } from "../../CustomTextInput/CustomTextInput";
import { useEffect, useMemo, useState } from "react";
import { IconChevronUp } from "@tabler/icons-react";
import { useForm, type UseFormReturnType } from "@mantine/form";
import { useRequest } from "../../../hooks/useRequest";
import type { UpdateCueReq, UpdateCueRes } from "../../../types/http";

type FormData = Cue;

export const CueCard = ({ cue, cueNumber }: { cue: Cue; cueNumber: number }) => {
  const { event } = useAppContext();

  // TODO: change into context under `activeCue`
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const fixtureGroups = event.fixtureGroups;

  const initialValues: FormData = useMemo(
    () => ({
      id: cue.id,
      comments: cue.comments,
      createdAt: cue.createdAt,
      updatedAt: cue.updatedAt,
      deletedAt: cue.deletedAt,

      assignments:
        cue && cue.assignments && Object.keys(cue.assignments).length != 0
          ? cue.assignments
          : Object.fromEntries(
              event.fixtureGroups.map((group) => [
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
                          [AttributeTypes.TEXT]: null,
                          [AttributeTypes.SELECT]: "",
                          [AttributeTypes.MULTISELECT]: [],
                          [AttributeTypes.COLOUR]: { hex: "", name: "" },
                          [AttributeTypes.SLIDER]: null,
                          [AttributeTypes.BOOLEAN]: false,
                          [AttributeTypes.NONE]: null,
                        },
                      },
                    ]),
                  ),
                },
              ]),
            ),
    }),
    [cue],
  );
  const form = useForm<FormData>({
    mode: "uncontrolled",
    initialValues,

    onValuesChange: (v) => {
      console.log(v);

      setIsDirty(true);
    },
  });

  const { executeRequest } = useRequest<UpdateCueReq, UpdateCueRes>(
    `/api/v1/events/${event.id}/items/${cue.id}/cues/${cue.id}`,
    "PATCH",
  );

  const handleSave = async () => {
    try {
      console.log(form.getValues(), "--------------------");
      // convert the form value to API request body
      const requestBody: UpdateCueReq = {
        comments: form.values.comments,
        assignments: form.values.assignments,
      };

      // transform empty strings to NULLs.
      // because postgres will reject empty strings for VARCHAR

      await executeRequest(requestBody);
    } catch (e) {
    } finally {
      setIsDirty(false);
    }
  };

  return (
    <CardBase isActive={false}>
      <Stack gap={0}>
        <Group mb="md">
          <Title order={4}> Cue {cueNumber} </Title>
          <Box flex={1} />
          <Button color="orange" size="xs" disabled={!isDirty} onClick={() => handleSave()}>
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
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {fixtureGroups.map((group, index) => (
              <FixtureGroupSection key={group.id} group={group} index={index + 1} form={form} />
            ))}
          </SimpleGrid>
        </Collapse>
      </Stack>
    </CardBase>
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
  index,
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
        />
      );

    case AttributeTypes.BOOLEAN:
      return (
        <Checkbox
          label={name}
          defaultChecked={optionPossibleValues[AttributeTypes.BOOLEAN] === BooleanOptions.CHECKED}
          name={`${baseFieldName}.${AttributeTypes.BOOLEAN}`}
          key={form.key(`${baseFieldName}.${AttributeTypes.BOOLEAN}`)}
          {...form.getInputProps(`${baseFieldName}.${AttributeTypes.BOOLEAN}`)}
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
}: {
  name: string;
  colourOptions: ColourOption[];
  fieldName: string;
  form: UseFormReturnType<FormData>;
}) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  // `search` is transient UI state — it controls the input text for dropdown filtering.
  // The actual committed value (a ColourOption object) lives in the form.
  const [search, setSearch] = useState("");

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

  // register onChange even

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
              .reduce((cur, key) => (cur ? cur[key] : undefined), form.getValues()) as ColourOption | undefined;

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
                  formPath.split(".").reduce((cur, key) => (cur ? cur[key] : undefined), form.getValues()) as
                    | ColourOption
                    | undefined
                )?.hex,
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
          width: "20px",
          height: "20px",
          borderRadius: "4px",
        }}
      />
      <Text>{name}</Text>
    </Group>
  );
}
