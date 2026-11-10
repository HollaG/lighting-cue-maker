import { Box, Button, Container, Divider, Group, Loader, NumberInput, Select, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";
import { useUpdateEvent } from "../../../../query-v2/events/useUpdateEvent";
import { useGetFixtureTemplates } from "../../../../query-v2/fixture-templates/useGetFixtureTemplates";
import { useGetPatchedFixtures } from "../../../../query-v2/patched-fixtures/useGetPatchedFixtures";
import { useUpsertPatchedFixtures } from "../../../../query-v2/patched-fixtures/useUpsertPatchedFixtures";
import type { UpsertPatchedFixture } from "../../../../types-v2/patchedFixture";
import { Logger } from "../../../../utils/logger";
import { STEP_FORM_ID } from "../StepForm";
import { groupSelectionByManufacturer, type FixtureSelection } from "./fixtureSelection";
import { AlreadySelectedFixtureRow } from "./FixtureRows/AlreadySelectedFixtureRow";
import { SelectedFixtureRow } from "./FixtureRows/SelectedFixtureRow";

const logger = new Logger("Step2.tsx");

/** Fixture selection */
export const Step2 = ({
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
