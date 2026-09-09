// This controls the items displayed inside a cuecard.
// It may vary, for example, we currently support two types: Blackout and Normal.
// We also support different display modes, currently "Table" and "2D View"

// Differentiate based on the cue type first.
// Blackout ignores display mode.
// Normal follows display mode
import {
  Accordion,
  Alert,
  Box,
  Button,
  Center,
  Flex,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Tooltip,
} from "@mantine/core";
import type { Cue, CueConfig } from "../../../types/cues";
import type { FixtureGroupConfiguration } from "../../../types/types";
import type { ViewMode } from "../CueCard/ViewModeSelect";
import { FixtureGroupSection } from "../FixtureGroupSection";
import type { UseFormReturnType } from "@mantine/form";
import type { Visualiser } from "../../../types/visualiser";
import { StaticStagePreview2D } from "../../Visualiser/Stage/2D/StagePreview2D";
import type { Fixture } from "../../../types/fixtures";
import type { Dispatch, SetStateAction } from "react";
import { IconInfoCircle } from "@tabler/icons-react";
import { BeforeCueEdit } from "../CueCard/BeforeCueEdit/BeforeCueEdit";

export const CueContents = ({
  cue,
  visualiser,
  cueNumber,
  fixtureGroups,
  viewMode,
  form,
  setIsAtLeastOneComboboxOpened,
  eventId,
  fixtures,
  activeFixtureGroupId,
  onFixtureSelect,
  isDirty,
  setActiveFixtureGroupId,
  onSaveCueConfig,
  onCopyCue,
  cueOrder,
  onDeleteCue,
}: {
  cue: Cue;
  visualiser: Visualiser | null;
  cueNumber: number;
  fixtureGroups: FixtureGroupConfiguration[];
  viewMode: ViewMode;
  form: UseFormReturnType<Cue>;
  eventId: string;
  fixtures: Fixture[];
  activeFixtureGroupId: string | null;
  isDirty: boolean;
  cueOrder: string[];

  setIsAtLeastOneComboboxOpened: (value: boolean) => void;
  onFixtureSelect: (_fixtureId: string, fixtureGroupId: string) => void;
  setActiveFixtureGroupId: Dispatch<SetStateAction<string | null>>;
  onSaveCueConfig: (cueConfig: CueConfig) => void;
  onCopyCue: (cueIdToCopyFrom: string, fixtureGroupIdsToCopy: string[], cueNumberToCopyFrom: number) => void;
  onDeleteCue: () => void;
}) => {
  if (cue.cueConfig.mode === "unknown") {
    return (
      <BeforeCueEdit
        cue={cue}
        onCopyCue={onCopyCue}
        onDeleteCue={onDeleteCue}
        cueOrder={cueOrder}
        cueConfig={cue.cueConfig}
        cueNumber={cueNumber}
        fixtureGroups={fixtureGroups}
        onSaveCueConfig={onSaveCueConfig}
      />
    );
  }

  if (cue.cueConfig.mode === "blackout") {
    return (
      <Alert variant="light" color="gray" title="Blackout cue" icon={<IconInfoCircle width="1rem" />}>
        <Stack>
          This is a blackout cue. All fixtures will be turned off when this cue is activated.
          <Box>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => onSaveCueConfig({ ...cue.cueConfig, mode: "normal", enabledGroups: [] })}
            >
              Change to normal cue
            </Button>
          </Box>
        </Stack>
      </Alert>
    );
  }

  if (cue.cueConfig.mode === "normal") {
    const enabledGroups = cue.cueConfig.enabledGroups;

    if (viewMode === "Table") {
      return (
        <Switch.Group
          name="cueConfig.enabledGroups"
          key={form.key("cueConfig.enabledGroups")}
          {...form.getInputProps("cueConfig.enabledGroups")}
        >
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="md">
            {fixtureGroups.map((group) => (
              <FixtureGroupSection
                disabled={cue.cueConfig.mode === "normal" && !cue.cueConfig.enabledGroups.includes(group.id)}
                key={group.id}
                group={group}
                form={form}
                setIsAtLeastOneComboboxOpened={setIsAtLeastOneComboboxOpened}
                showEnableTooltip={true}
              />
            ))}
          </SimpleGrid>
        </Switch.Group>
      );
    }

    if (viewMode === "2D View") {
      const enabledFixtureGroups = fixtureGroups.filter((group) => enabledGroups.includes(group.id));
      const disabledFixtureGroups = fixtureGroups.filter((group) => !enabledGroups.includes(group.id));
      return (
        <Box mb="md">
          {visualiser ? (
            <StaticStagePreview2D
              // No need for this, because we will never reach this case when in blackout mode
              // isBlackout={cue.cueConfig.mode === "blackout"}
              eventId={eventId}
              visualiser={visualiser}
              fixtures={fixtures}

              fixtureGroupsAssignment={cue.assignments}

              activeFixtureGroupId={activeFixtureGroupId}
              onFixtureSelect={onFixtureSelect}
              isLoading={isDirty}
              controls={
                <Switch.Group
                  name="cueConfig.enabledGroups"
                  key={form.key("cueConfig.enabledGroups")}
                  {...form.getInputProps("cueConfig.enabledGroups")}
                >
                  <Stack>
                    <Stack gap={0}>
                      <Text fw="bold">Active groups</Text>
                      <Accordion value={activeFixtureGroupId} onChange={setActiveFixtureGroupId}>
                        {enabledFixtureGroups.map((group) => (
                          <Accordion.Item key={group.id} value={group.id}>
                            <Accordion.Control>
                              <Group>
                                <Tooltip label={group.description}>
                                  <Text>{group.name}</Text>
                                </Tooltip>
                                <Flex flex={1} />
                                {activeFixtureGroupId === group.id && (
                                  <Box
                                    style={{
                                      backgroundColor: "var(--mantine-color-lime-4)",
                                      width: "16px",
                                      height: "16px",
                                      borderRadius: "50%",
                                      border: "2px solid black",
                                    }}
                                  />
                                )}

                                <Switch
                                  styles={{
                                    track: { cursor: "pointer" },
                                    input: { cursor: "pointer" },
                                  }}
                                  value={group.id}
                                  onLabel="ON"
                                  offLabel="OFF"
                                  mr="md"
                                />
                              </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                              <FixtureGroupSection
                                showGroupInfo={false}

                                key={group.id}
                                group={group}
                                form={form}
                                setIsAtLeastOneComboboxOpened={setIsAtLeastOneComboboxOpened}
                              />
                            </Accordion.Panel>
                          </Accordion.Item>
                        ))}
                      </Accordion>
                    </Stack>

                    <Stack gap={0}>
                      <Text fw="bold">Inactive groups</Text>
                      <Accordion value={activeFixtureGroupId} onChange={setActiveFixtureGroupId}>
                        {disabledFixtureGroups.map((group) => (
                          <Accordion.Item key={group.id} value={group.id}>
                            <Accordion.Control>
                              <Group>
                                <Tooltip label={group.description}>
                                  <Text>{group.name}</Text>
                                </Tooltip>
                                <Flex flex={1} />

                                {activeFixtureGroupId === group.id && (
                                  <Box
                                    style={{
                                      backgroundColor: "var(--mantine-color-lime-4)",
                                      width: "16px",
                                      height: "16px",
                                      borderRadius: "50%",
                                      border: "2px solid black",
                                    }}
                                  />
                                )}
                                <Switch
                                  styles={{
                                    track: { cursor: "pointer" },
                                    input: { cursor: "pointer" },
                                  }}
                                  value={group.id}
                                  onLabel="ON"
                                  offLabel="OFF"
                                  mr="md"
                                />
                              </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                              <FixtureGroupSection
                                disabled={true}
                                showEnableTooltip
                                showGroupInfo={false}

                                key={group.id}
                                group={group}
                                form={form}
                                setIsAtLeastOneComboboxOpened={setIsAtLeastOneComboboxOpened}
                              />
                            </Accordion.Panel>
                          </Accordion.Item>
                        ))}
                      </Accordion>
                    </Stack>
                  </Stack>
                </Switch.Group>
              }
            />
          ) : (
            <Center>
              <Loader />
            </Center>
          )}
        </Box>
      );
    }
  }
};
