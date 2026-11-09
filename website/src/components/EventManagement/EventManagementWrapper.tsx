import {
  Box,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  MultiSelect,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useIsMutating } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";
import { useCreateEvent } from "../../query-v2/events/useCreateEvent";
import { useGetEvent } from "../../query-v2/events/useGetEvent";
import { useUpdateEvent } from "../../query-v2/events/useUpdateEvent";
import {
  useGetFixtureTemplates,
  type FixtureTemplateSummary,
} from "../../query-v2/fixture-templates/useGetFixtureTemplates";
import { CustomTextInput } from "../CustomTextInput/CustomTextInput";
import { useUpsertPatchedFixtures } from "../../query-v2/patched-fixtures/useUpsertPatchedFixtures";
import { Logger } from "../../utils/logger";
import type { PatchedFixture, UpsertPatchedFixture } from "../../types-v2/patchedFixture";
import { useGetPatchedFixtures } from "../../query-v2/patched-fixtures/useGetPatchedFixtures";
import { CardBase } from "../Cues/CardBase";
import type { FixtureGroup, UpsertFixtureGroup } from "../../types-v2/fixtureGroups";
import { useGetFixtureGroups } from "../../query-v2/fixture-groups/useGetFixtureGroups";
import { useUpsertFixtureGroups } from "../../query-v2/fixture-groups/useUpsertFixtureGroups";
import { useDeleteFixtureGroup } from "../../query-v2/fixture-groups/useDeleteFixtureGroup";
import { useDebouncedCallback } from "@mantine/hooks";

const logger = new Logger("EventManagementWrapper.tsx");

// The wrapper's "Next step" button submits whichever step form is on screen
// (native `form` attribute). Each step saves in its onSubmit, then calls onDone.
const STEP_FORM_ID = "event-step-form";

/**
 * Wrapper for all steps to hook into the "Next" button
 * the Next button submits the form with the respective ID.
 */
const StepForm = ({ onSubmit, children }: { onSubmit: () => void; children: ReactNode }) => (
  <form
    id={STEP_FORM_ID}
    onSubmit={(e: FormEvent) => {
      e.preventDefault();
      onSubmit();
    }}
  >
    {children}
  </form>
);

const STEPS: {
  label: string;
  description: string;
}[] = [
  {
    label: "Event details",
    description: "Basic event details",
  },
  {
    label: "Fixtures",
    description: "Manage lights",
  },
  {
    label: "Fixture groups",
    description: "Configure fixture groupings",
  },
  {
    label: "Fixture placements",
    description: "Set up your stage simulation",
  },
  {
    label: "Fixture presets",
    description: "Set up your presets for easy selection",
  },
];

type EventDetailsValues = {
  name: string;
  description: string;
  externalLink: string;
};

// template id -> number of fixtures to patch
// type FixtureSelection = Record<string, number>;
type FixtureSelection = {
  [templateId: string]: {
    [modeId: string]: number;
  };
};

// one row in the selected-fixtures list
type SelectedRow = { template: FixtureTemplateSummary; modeId: string; modeName: string; count: number };

/**
 * Create mode: no `eventId`, only Step 1 is reachable. Saving it creates the event and
 * switches to edit mode (/events/{id}/edit?step=1).
 *
 * Edit mode: `eventId` and `step` come from the URL, so a refresh keeps both.
 */
export const EventManagementWrapper = ({ eventId, step = 0 }: { eventId?: string; step?: number }) => {
  const navigate = useNavigate();

  const active = eventId ? Math.min(Math.max(Math.trunc(step), 0), STEPS.length - 1) : 0;

  const goToStep = (id: string, next: number, replace = false) =>
    navigate({ to: "/events/$eventId/edit", params: { eventId: id }, search: { step: next }, replace });

  const nextStep = () => {
    if (eventId && active < STEPS.length - 1) goToStep(eventId, active + 1);
  };
  const prevStep = () => {
    if (eventId && active > 0) goToStep(eventId, active - 1);
  };

  // Covers every step's save, so the steps don't have to report it.
  const isSavingStep1 =
    useIsMutating({
      mutationKey: ["event-config-1"],
    }) > 0;

  const isSavingStep2 =
    useIsMutating({
      mutationKey: ["event-config-2"],
    }) > 0;
  const isSavingStep3 =
    useIsMutating({
      mutationKey: ["event-config-3"],
    }) > 0;
  const isSavingStep4 =
    useIsMutating({
      mutationKey: ["event-config-4"],
    }) > 0;
  const isSavingStep5 =
    useIsMutating({
      mutationKey: ["event-config-5"],
    }) > 0;

  const isNextLoading = isSavingStep1 || isSavingStep2 || isSavingStep3 || isSavingStep4 || isSavingStep5;
  return (
    <Stack px={"4rem"} gap="2rem" style={{ maxWidth: "125rem", margin: "auto" }}>
      <Stepper
        active={active}
        onStepClick={(index) => eventId && goToStep(eventId, index)}
        // Edit mode can jump to any step; create mode has to save Step 1 first.
        allowNextStepsSelect={!!eventId}
      >
        {STEPS.map((step, index) => (
          <Stepper.Step key={index} label={step.label} description={active === index ? step.description : undefined}>
            {index === 0 ? (
              <Step1
                eventId={eventId ?? null}
                // replace on create, so the browser's back button doesn't return to an empty create form
                onDone={(id) => goToStep(id, 1, !eventId)}
              />
            ) : index === 1 ? (
              // TODO: save the fixtures before moving on
              eventId ? (
                <Step2
                  eventId={eventId}

                  onDone={() => goToStep(eventId, 2)}
                />
              ) : null
            ) : index === 2 ? (
              eventId ? (
                <Step3 onDone={() => goToStep(eventId, 3)} eventId={eventId} />
              ) : null
            ) : index === 3 ? (
              eventId ? (
                <Step4 onDone={() => goToStep(eventId, 4)} eventId={eventId} />
              ) : null
            ) : (
              <StepForm onSubmit={nextStep}>
                Step {index + 1} content: {step.description}
              </StepForm>
            )}
          </Stepper.Step>
        ))}

        <Stepper.Completed>Completed, click back button to get to previous step</Stepper.Completed>
      </Stepper>
      <Center>
        <Group>
          <Button variant="subtle" onClick={prevStep} disabled={active === 0}>
            Back
          </Button>
          <Button type="submit" form={STEP_FORM_ID} loading={isNextLoading} disabled={active === STEPS.length - 1}>
            Next step
          </Button>
        </Group>
      </Center>
    </Stack>
  );
};

/** Event creation and details */
const Step1 = ({ eventId, onDone }: { eventId: string | null; onDone: (eventId: string) => void }) => {
  const form = useForm<EventDetailsValues>({
    mode: "uncontrolled",
    initialValues: { name: "", description: "", externalLink: "" },
    validate: {
      name: (value) => (value.trim() ? null : "Give the event a name"),
    },
  });

  const { mutateAsync: createEvent } = useCreateEvent();
  const { mutateAsync: updateEvent } = useUpdateEvent();

  // Coming back to this step (or edit mode): fill the form with the saved event.
  // form.initialize only applies once, so later refetches don't overwrite what the LD is typing.
  const { event } = useGetEvent(eventId);
  useEffect(() => {
    if (!event) return;
    form.initialize({
      name: event.name,
      description: event.description ?? "",
      externalLink: event.externalLink ?? "",
    });
  }, [event]); // eslint-disable-line react-hooks/exhaustive-deps -- form is stable

  const save = async (values: EventDetailsValues) => {
    try {
      if (eventId) {
        // fixtureTemplateIds left out on purpose: sending it replaces the event's templates.
        await updateEvent({ eventId, req: { event: values } });
        onDone(eventId);
      } else {
        const res = await createEvent({ event: values, fixtureTemplateIds: [] });
        onDone(res.event.id);
      }
    } catch {
      // error notif handled by api.ts
    }
  };

  return (
    <Container>
      <Group style={{ alignItems: "flex-start", width: "100%" }} gap="4rem">
        {/* Left form */}
        <Box flex={2}>
          <form id={STEP_FORM_ID} onSubmit={form.onSubmit(save)}>
            <Stack w="stretch">
              <CustomTextInput
                placeholder="Type your event name here..."
                size="xxl"
                name="name"
                key={form.key("name")}
                {...form.getInputProps("name")}
              />

              <Textarea
                minRows={3}
                variant="unstyled"
                autosize
                name="description"
                key={form.key("description")}
                {...form.getInputProps("description")}
                placeholder="Type a brief description e.g. rules/remarks that choreographers can see."
                styles={{ input: { fontSize: "16px" } }}
              />

              <CustomTextInput
                label="Google Docs / OneDrive / Link"
                placeholder="Paste a link to more information, if necessary"
                name="externalLink"
                key={form.key("externalLink")}
                {...form.getInputProps("externalLink")}
              />
            </Stack>
          </form>
        </Box>
      </Group>
    </Container>
  );
};

/** Fixture selection */
const Step2 = ({
  eventId,
  onDone,
}: {
  eventId: string;

  onDone: () => void;
}) => {
  const { fixtureTemplates, isFixtureTemplatesLoading } = useGetFixtureTemplates();
  const { mutateAsync: updateEvent } = useUpdateEvent();
  const { mutateAsync: upsertPatchedFixtures } = useUpsertPatchedFixtures(eventId);
  const { patchedFixtures } = useGetPatchedFixtures(eventId);
  const alreadySelectedSelection = patchedFixtures.reduce((acc, fixture) => {
    acc[fixture.fixtureTemplateId] ??= {};
    acc[fixture.fixtureTemplateId][fixture.modeId] = (acc[fixture.fixtureTemplateId][fixture.modeId] || 0) + 1;
    return acc;
  }, {} as FixtureSelection);

  const groupedByManufacturer = fixtureTemplates.reduce(
    (acc, template) => {
      if (!acc[template.manufacturer]) {
        acc[template.manufacturer] = [];
      }
      acc[template.manufacturer].push(template);
      return acc;
    },
    {} as Record<string, typeof fixtureTemplates>,
  );

  const selectData = Object.entries(groupedByManufacturer).map(([manufacturer, templates]) => ({
    group: manufacturer,
    items: templates.map((template) => ({
      label: template.name,
      value: template.id,
    })),
  }));

  const [fixtureSelection, setFixtureSelection] = useState<FixtureSelection>({});

  // --- picker input (temporary, fine to lose when the step unmounts) ---------
  const [selectedFixtureTemplateId, setSelectedFixtureTemplateId] = useState<string | null>(null);
  const selectedFixtureTemplate = fixtureTemplates.find((t) => t.id === selectedFixtureTemplateId);
  const [selectedFixtureModeId, setSelectedFixtureModeId] = useState<string | null>(null);
  const [count, setCount] = useState<number>(1);

  const onAddFixture = () => {
    if (!selectedFixtureTemplateId) return;
    if (!selectedFixtureModeId) return;
    setFixtureSelection((prev) => ({
      ...prev,
      [selectedFixtureTemplateId]: {
        ...prev[selectedFixtureTemplateId],
        [selectedFixtureModeId]: (prev[selectedFixtureTemplateId]?.[selectedFixtureModeId] || 0) + count,
      },
    }));
  };

  const groupedSelectedTemplatesByManufacturer = groupSelectionByManufacturer(fixtureSelection, fixtureTemplates);
  const groupedAlreadySelectedByManufacturer = groupSelectionByManufacturer(alreadySelectedSelection, fixtureTemplates);

  const onCountChange = (templateId: string, modeId: string, newCount: number) => {
    setFixtureSelection((prev) => ({
      ...prev,
      [templateId]: { ...prev[templateId], [modeId]: newCount },
    }));
  };

  // removes one (template, mode) row; drops the template once it has no modes left
  const onDeleteFixture = (templateId: string, modeId: string) => {
    setFixtureSelection((prev) => {
      const { [modeId]: _removedMode, ...restModes } = prev[templateId] ?? {};
      const { [templateId]: _removedTemplate, ...rest } = prev;
      return Object.keys(restModes).length > 0 ? { ...rest, [templateId]: restModes } : rest;
    });
  };

  const save = async () => {
    try {
      const fixtures: UpsertPatchedFixture[] = [];
      for (const [templateId, modes] of Object.entries(fixtureSelection)) {
        for (const [modeId, count] of Object.entries(modes)) {
          const template = fixtureTemplates.find((t) => t.id === templateId);
          let fixture: UpsertPatchedFixture = {
            eventId,
            name: `${template?.manufacturer} ${template?.name}`,
            fixtureTemplateId: templateId,
            modeId,
            posX: 0,
            posY: 0,
            posZ: 0,
            rotX: 0,
            rotY: 0,
            rotZ: 0,
          };

          for (let i = 0; i < count; i++) {
            fixtures.push(fixture);
          }
        }
      }

      // first, add the templateIds into the event's fixtureTemplateIds
      const templateIds = Object.keys(fixtureSelection);
      await updateEvent({ eventId, req: { fixtureTemplateIds: templateIds } });

      await upsertPatchedFixtures(fixtures);

      logger.info("Saving fixture selection", fixtures);

      onDone();
    } catch (e) {
      // api errors handled by api.ts
    }
  };

  return (
    <Container>
      <form
        id={STEP_FORM_ID}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Box
          style={{
            display: "flex",
            alignItems: "flex-start",

            // backgroundColor: "var(--mantine-color-dark-7)",
            // borderRadius: "var(--mantine-radius-lg)",
            // border: "1px solid var(--mantine-color-dark-5)",
          }}

          // flex={1}
          // p="lg"
        >
          <Stack style={{ width: "stretch" }} gap="sm">
            <Group>
              <Title order={4} flex={1}>
                Add fixtures
              </Title>
              {isFixtureTemplatesLoading && <Loader size="sm" type="bars" />}
            </Group>
            <Text> Add all the lights that your show uses, along with its configured DMX mode.</Text>
            <Group gap="0">
              <Select
                disabled={isFixtureTemplatesLoading}
                placeholder="Select a fixture model"
                data={selectData}
                searchable
                flex={1}
                mr="sm"

                value={selectedFixtureTemplateId}
                onChange={(id) => {
                  setSelectedFixtureTemplateId(id);
                  // the old mode belongs to the previous template; default to the new one's first mode
                  setSelectedFixtureModeId(fixtureTemplates.find((t) => t.id === id)?.modes[0]?.id ?? null);
                }}
              />

              <Box style={{ width: "12rem" }}>
                <Select
                  data={
                    selectedFixtureTemplate
                      ? selectedFixtureTemplate.modes.map((mode) => ({ value: mode.id, label: mode.name }))
                      : []
                  }
                  placeholder="Select a mode"
                  disabled={!selectedFixtureTemplate}
                  value={selectedFixtureModeId}
                  onChange={setSelectedFixtureModeId}
                />
              </Box>
              <Box style={{ width: "4rem" }}>
                <NumberInput defaultValue={1} value={count} onChange={(e) => setCount(Number(e))} min={1} />
              </Box>
              <Button variant="light" onClick={onAddFixture}>
                {" "}
                Add
              </Button>
            </Group>
            {/* <Divider /> */}
            <Stack mt="md" style={{ minHeight: "15rem" }}>
              {Object.entries(groupedSelectedTemplatesByManufacturer).map(([manufacturer, fixtures]) => (
                <SelectedFixtureRow
                  key={manufacturer}
                  groupKey={manufacturer}
                  fixtures={fixtures}
                  onCountChange={onCountChange}
                  onDelete={onDeleteFixture}
                />
              ))}
            </Stack>
            {Object.keys(groupedAlreadySelectedByManufacturer).length > 0 && (
              <Stack mt="md" gap="xs">
                <Text c="dimmed" size="sm">
                  Already in this event
                </Text>
                {Object.entries(groupedAlreadySelectedByManufacturer).map(([manufacturer, fixtures]) => (
                  <AlreadySelectedFixtureRow key={manufacturer} groupKey={manufacturer} fixtures={fixtures} />
                ))}
              </Stack>
            )}

            <Divider />
            <Text c="dimmed">You can rename your fixtures and group them in the next step.</Text>
          </Stack>
        </Box>
      </form>
    </Container>
  );
};

const SelectedFixtureRow = ({
  groupKey,
  fixtures,
  onCountChange,
  onDelete,
}: {
  groupKey: string;
  fixtures: SelectedRow[];
  onCountChange: (templateId: string, modeId: string, newCount: number) => void;
  onDelete: (templateId: string, modeId: string) => void;
}) => {
  return (
    <Stack gap={"xs"}>
      <Title order={5}>{groupKey}</Title>
      {fixtures.map((fixture) => (
        <Group key={`${fixture.template.id}:${fixture.modeId}`} align="center">
          <Text
            style={{
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            flex={1}
          >
            {fixture.template.name}{" "}
          </Text>
          <Text span c="dimmed">
            {fixture.modeName}
          </Text>
          <Box style={{ width: "4rem" }}>
            <NumberInput
              value={fixture.count}
              onChange={(e) => onCountChange(fixture.template.id, fixture.modeId, Number(e))}
              min={1}
            />
          </Box>
          <Button color="red" variant="subtle" onClick={() => onDelete(fixture.template.id, fixture.modeId)}>
            Delete
          </Button>
        </Group>
      ))}
    </Stack>
  );
};

/** Fixtures already saved in the event: same layout as SelectedFixtureRow, but read-only (add-only step). */
const AlreadySelectedFixtureRow = ({ groupKey, fixtures }: { groupKey: string; fixtures: SelectedRow[] }) => {
  return (
    <Stack gap={"xs"}>
      <Title order={5}>{groupKey}</Title>
      {fixtures.map((fixture) => (
        <Group key={`${fixture.template.id}:${fixture.modeId}`} align="center">
          <Text
            style={{
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            flex={1}
          >
            {fixture.template.name}{" "}
          </Text>
          <Text span c="dimmed">
            {fixture.modeName}
          </Text>
          <Box style={{ width: "4rem" }}>
            <NumberInput value={fixture.count} disabled />
          </Box>
        </Group>
      ))}
    </Stack>
  );
};

/** One row per (template, mode), grouped by manufacturer. Templates not in the library are skipped. */
const groupSelectionByManufacturer = (
  selection: FixtureSelection,
  fixtureTemplates: FixtureTemplateSummary[],
): Record<string, SelectedRow[]> => {
  const acc: Record<string, SelectedRow[]> = {};
  for (const [templateId, modes] of Object.entries(selection)) {
    const template = fixtureTemplates.find((t) => t.id === templateId);
    if (!template) continue;

    for (const [modeId, count] of Object.entries(modes)) {
      const modeName = template.modes.find((m) => m.id === modeId)?.name ?? modeId;
      (acc[template.manufacturer] ??= []).push({ template, modeId, modeName, count });
    }
  }
  return acc;
};

/** Fixture grouping and arrangement */
const Step3 = ({ eventId, onDone }: { onDone: () => void; eventId: string }) => {
  const { patchedFixtures, isPatchedFixturesLoading } = useGetPatchedFixtures(eventId);
  const { event } = useGetEvent(eventId);
  const { fixtureGroups, isFixtureGroupsLoading } = useGetFixtureGroups(eventId);

  const { mutateAsync: upsertFixtureGroups } = useUpsertFixtureGroups(eventId);

  const fixtureTemplates = event?.fixtureTemplates ?? [];

  const patchedFixturesGroupedByManufacturer = patchedFixtures.reduce(
    (acc, fixture) => {
      const template = fixtureTemplates.find((t) => t.id === fixture.fixtureTemplateId);
      if (!template) return acc;
      (acc[template.manufacturer] ??= []).push(fixture);
      return acc;
    },
    {} as Record<string, PatchedFixture[]>,
  );

  const multiselectData = Object.entries(patchedFixturesGroupedByManufacturer).map(([manufacturer, fixtures]) => ({
    group: manufacturer,
    items: fixtures.map((fixture) => ({ value: fixture.id, label: fixture.name })),
  }));

  // const [groups, setGroups] = useState<UpsertFixtureGroup[]>([]);
  const [selectedFixtureIds, setSelectedFixtureIds] = useState<string[]>([]);
  const onAddGroup = async () => {
    if (selectedFixtureIds.length === 0) return;
    let group: UpsertFixtureGroup = {
      name: `Group ${fixtureGroups.length + 1}`,
      description: "",
      fixtureIds: selectedFixtureIds,
      grid: null,
      sortOrder: fixtureGroups.length,
    };

    const result = await upsertFixtureGroups([group]);

    // clear the selection so the user can add another group
    setSelectedFixtureIds([]);
    setSelectedFixtureGroupId(result.fixtureGroups[0].id); // deselect any group when a new one is added
  };

  // For the Grid
  const [selectedFixtureGroupId, setSelectedFixtureGroupId] = useState<string | null>(null);
  return (
    <form
      id={STEP_FORM_ID}
      onSubmit={(e) => {
        e.preventDefault();
        onDone();
      }}
    >
      <Stack gap="sm">
        <Title order={4} flex={1}>
          Configure fixture groups
        </Title>
        <Text>
          {" "}
          Group your fixtures into logical sets for easier management. Don't think about the technical details.
        </Text>

        <SimpleGrid cols={3} mt="lg" spacing="xl">
          {/* List of all fixtures */}
          <Box>
            <Title mb="lg" order={5}>
              {" "}
              Fixture list{" "}
            </Title>
            <Stack gap="xs">
              {patchedFixtures.map((fixture) => (
                <FixtureItem key={fixture.id} fixture={fixture} />
              ))}
            </Stack>
          </Box>

          {/* List of groups */}
          <Stack gap="xs">
            <Group>
              <Title flex={1} order={5}>
                Groups
              </Title>
            </Group>
            <Group>
              <MultiSelect
                data={multiselectData}
                disabled={isPatchedFixturesLoading}
                placeholder="Pick fixtures"
                searchable
                value={selectedFixtureIds}
                onChange={setSelectedFixtureIds}
                flex={1}
              />
              <Button variant="light" onClick={onAddGroup} disabled={selectedFixtureIds.length === 0}>
                Add group
              </Button>
            </Group>
            <Stack mt="md">
              {fixtureGroups.map((group, index) => (
                <GroupItem
                  fixtures={patchedFixtures.filter((f) => group.fixtureIds.includes(f.id))}
                  key={index}
                  group={group}
                  multiselectData={multiselectData}
                  eventId={eventId}

                  isSelected={selectedFixtureGroupId === group.id}
                  setIsSelected={() => setSelectedFixtureGroupId(group.id)}
                />
              ))}
            </Stack>
          </Stack>

          {/* Grid */}
          <GridControl />
        </SimpleGrid>
      </Stack>
    </form>
  );
};

const FixtureItem = ({ fixture, rightSection }: { fixture: PatchedFixture; rightSection?: React.ReactNode }) => {
  return (
    <CardBase isActive={false}>
      <Stack>
        <Group>
          <Text fw="semibold" flex={1}>
            {fixture.name}
          </Text>
          {rightSection}
        </Group>
      </Stack>
    </CardBase>
  );
};

const GroupItem = ({
  group,
  multiselectData,
  eventId,
  fixtures,

  isSelected,
  setIsSelected,
}: {
  eventId: string;
  group: FixtureGroup;
  fixtures: PatchedFixture[];
  multiselectData: {
    group: string;
    items: {
      value: string;
      label: string;
    }[];
  }[];

  isSelected: boolean;
  setIsSelected: () => void;
}) => {
  const [selectedNewFixtureIds, setSelectedNewFixtureIds] = useState<string[]>([]);

  const { mutateAsync: deleteFixtureGroup } = useDeleteFixtureGroup(eventId);
  const { mutateAsync: upsertFixtureGroups, isPending: isUpserting } = useUpsertFixtureGroups(eventId);

  // handle saving the text fields
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);

  const saveName = useDebouncedCallback(
    (name: string) => {
      if (name.trim() === "") return; // don't save empty names
      void upsertFixtureGroups([{ ...group, name }]);
    },
    { delay: 600, flushOnUnmount: true }, // leaving the step mid-typing still saves
  );

  const saveDescription = useDebouncedCallback(
    (description: string) => {
      if (description.trim() === "") return; // don't save empty names

      void upsertFixtureGroups([{ ...group, description }]);
    },
    { delay: 600, flushOnUnmount: true },
  );

  // filter out fixtures that are already in the group, so the user can't add them again
  const filteredMultiselectData = multiselectData.map((optionGroup) => ({
    ...optionGroup,
    items: optionGroup.items.map((item) => ({ ...item, disabled: group.fixtureIds.includes(item.value) })),
  }));

  const onAddFixturesToGroup = async () => {
    const updatedGroup: UpsertFixtureGroup = {
      ...group,
      fixtureIds: [...group.fixtureIds, ...selectedNewFixtureIds],
    };
    await upsertFixtureGroups([updatedGroup]);

    // clear the selection so the user can add more fixtures
    setSelectedNewFixtureIds([]);
    setIsSelected(); // select the group when the user adds fixtures
  };

  const onRemoveFixtureFromGroup = async (fixtureId: string) => {
    const updatedGroup: UpsertFixtureGroup = {
      ...group,
      fixtureIds: group.fixtureIds.filter((id) => id !== fixtureId),
    };
    await upsertFixtureGroups([updatedGroup]);
    setIsSelected(); // select the group when the user removes fixtures
  };

  return (
    <CardBase isActive={isSelected}>
      <Stack gap="xs">
        <Group>
          {/* <Text fw="semibold">{gr.name}</Text> */}
          <CustomTextInput
            placeholder="Group name"
            value={name}
            onChange={(e) => {
              setName(e.currentTarget.value);
              saveName(e.currentTarget.value);
              setIsSelected(); // select the group when the user starts typing
            }}
            onBlur={() => saveName.flush()} // save right away when the field loses focus
            flex={1}
          />
          <Button variant={isSelected ? "light" : "subtle"} size="xs" onClick={() => setIsSelected()}>
            Manage grid
          </Button>
          <Button
            variant="subtle"
            color="red"
            size="xs"
            onClick={() => {
              deleteFixtureGroup(group.id);
              setIsSelected(); // deselect the group when it's deleted
            }}
          >
            Delete{" "}
          </Button>
          {/* <Button size="xs" variant="light" loading={isUpserting}>
            {" "}
            Save{" "}
          </Button> */}
        </Group>
        <Textarea
          minRows={1}
          variant="unstyled"
          autosize
          value={description}
          onChange={(e) => {
            setDescription(e.currentTarget.value);
            saveDescription(e.currentTarget.value);
            setIsSelected(); // select the group when the user starts typing
          }}
          onBlur={() => saveDescription.flush()}
          // name="description"
          // key={form.key("description")}
          // {...form.getInputProps("description")}
          placeholder="Description of what this group is for, what it does"
          // styles={{ input: { fontSize: "16px" } }}
        />
        <Divider />
        <Group>
          <MultiSelect
            data={filteredMultiselectData}
            // disabled={isPatchedFixturesLoading}
            placeholder="Pick fixtures"
            searchable
            value={selectedNewFixtureIds}
            onChange={setSelectedNewFixtureIds}
            flex={1}
            size="xs"
          />
          <Button
            variant="subtle"
            size="xs"
            disabled={selectedNewFixtureIds.length === 0}
            onClick={onAddFixturesToGroup}
          >
            Add to group
          </Button>
        </Group>
        <Stack gap="xs">
          {fixtures.map((fixture) => (
            <FixtureItem
              key={fixture.id}
              fixture={fixture}
              rightSection={
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  onClick={() => {
                    onRemoveFixtureFromGroup(fixture.id);
                  }}
                >
                  Remove
                </Button>
              }
            />
          ))}
        </Stack>
      </Stack>
    </CardBase>
  );
};

// TODO: come back here once done with the main flow
const GridControl = () => {
  return (
    <CardBase isActive={false}>
      <Stack gap="xs">
        <Group>
          <Title order={5} flex={1}>
            Grid{" "}
          </Title>
          <Group gap="xs">
            <Text> Rows </Text>
            <Box style={{ width: "4rem" }}>
              <NumberInput defaultValue={1} min={1} />
            </Box>
            <Text> x Cols </Text>
            <Box style={{ width: "4rem" }}>
              <NumberInput defaultValue={1} min={1} />
            </Box>
          </Group>
        </Group>
        <Text c="dimmed" fz="sm">
          Used to apply effect patterns. Don't bother if you don't need accurate visualisations for dynamic
          effects.{" "}
        </Text>
      </Stack>
    </CardBase>
  );
};

/** Visualisation placements */
const Step4 = ({ eventId, onDone }: { eventId: string; onDone: () => void }) => {
  return (
    <form
      id={STEP_FORM_ID}
      onSubmit={(e) => {
        e.preventDefault();
        onDone();
      }}
    ></form>
  );
};
