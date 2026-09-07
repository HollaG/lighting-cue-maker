import {
  Stack,
  Title,
  Center,
  Group,
  Text,
  SimpleGrid,
  Checkbox,
  Button,
  Grid,
  Box,
  Divider,
  Radio,
  Menu,
} from "@mantine/core";
import type { FixtureGroupConfiguration } from "../../../../types/types";
import { CheckboxCard } from "../../../CheckboxCard/CheckboxCard";
import { useState } from "react";
import { RadioCard } from "../../../RadioCard/RadioCard";
import type { Cue, CueConfig, CueMode } from "../../../../types/cues";

/**
 * This component displays a little help box when the user first creates a cue.
 * It is intended to give the user an easier time selecting what fixture groups they want to use
 */
export const BeforeCueEdit = ({
  cue,
  cueConfig,
  cueOrder,
  cueNumber,
  fixtureGroups,
  onSaveCueConfig,
  onCopyCue,
  onDeleteCue,
}: {
  cue: Cue;
  cueConfig: CueConfig;
  cueOrder: string[];
  cueNumber: number;
  fixtureGroups: FixtureGroupConfiguration[];
  onSaveCueConfig: (cueConfig: CueConfig) => void;
  onCopyCue: (cueIdToCopyFrom: string, fixtureGroupIdsToCopy: string[], cueNumberToCopyFrom: number) => void;
  onDeleteCue: () => void;
}) => {
  // Internal state only. Only sync when "save" button pressed
  let initialCueType: CueMode = cueConfig.mode === "unknown" ? "normal" : cueConfig.mode; // default to normal if unknown
  const [tempCueType, setTempCueType] = useState<CueMode>(initialCueType); // always default to the provided cue mode

  // Internal state only. Only sync when "save" button pressed
  const [tempEnabledGroups, setTempEnabledGroups] = useState<string[]>(
    cueConfig.mode === "normal" ? cueConfig.enabledGroups : [],
  );

  const onConfirm = () => {
    const cueConfig: CueConfig =
      tempCueType === "normal" ? { mode: "normal", enabledGroups: tempEnabledGroups } : { mode: "blackout" };

    onSaveCueConfig(cueConfig);
  };

  // for copying
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
    <Stack>
      <Group mb="md">
        <Title order={4}> Cue {cueNumber}</Title>
      </Group>

      <Grid gap="lg">
        <Grid.Col span={3}>
          <Group wrap="nowrap" align="start">
            <Box mt="5px">
              <Button variant="outline" style={{ pointerEvents: "none" }} w="50px" size="sm">
                1
              </Button>
            </Box>
            <Stack gap={0}>
              <Text fw="bold">Choose cue type</Text>
              <Text fz="sm" c="dark.1">
                Choose what type of cue you want to create.
              </Text>
            </Stack>
          </Group>
        </Grid.Col>
        <Grid.Col span={9}>
          <Radio.Group value={tempCueType} onChange={setTempCueType}>
            <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 4 }} spacing="xs">
              <RadioCard name="Normal cue" description="Standard lighting cue" value="normal" />
              <RadioCard name="Blackout cue" description="Completely darken the stage" value="blackout" />
            </SimpleGrid>
          </Radio.Group>
        </Grid.Col>
        {tempCueType === "normal" && (
          <>
            <Grid.Col span={12} px="16rem">
              <Divider label="" />
            </Grid.Col>
            <Grid.Col span={3}>
              <Group wrap="nowrap" align="start">
                <Box mt="5px">
                  <Button variant="outline" style={{ pointerEvents: "none" }} w="50px" size="sm">
                    2
                  </Button>
                </Box>
                <Stack gap={0}>
                  <Text fw="bold">Choose light groups</Text>
                  <Text fz="sm" c="dark.1">
                    Choose which light groups you want to include in this cue.
                  </Text>
                </Stack>
              </Group>
            </Grid.Col>
            <Grid.Col span={9}>
              <Checkbox.Group value={tempEnabledGroups} onChange={setTempEnabledGroups}>
                <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 4 }} spacing="xs">
                  {fixtureGroups.map((group) => (
                    <CheckboxCard key={group.id} name={group.name} description={group.description} value={group.id} />
                  ))}
                </SimpleGrid>
              </Checkbox.Group>
            </Grid.Col>
          </>
        )}
      </Grid>

      <Center>
        <Group>
          <Button variant="subtle" color="red" size="sm" onClick={onDeleteCue}>
            Delete cue
          </Button>

          <Divider orientation="vertical" />
          <Menu shadow="md">
            <Menu.Target>
              <Button
                variant="transparent"

                // style={{
                //   textDecoration: "underline dotted",
                // }}
                // onClick={open}
              >
                Copy another cue
              </Button>
            </Menu.Target>
            <Menu.Dropdown mah={500} style={{ overflowY: "auto" }}>
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
          <Button variant="light" size="sm" onClick={onConfirm}>
            Confirm
          </Button>
        </Group>
      </Center>
    </Stack>
  );
};
