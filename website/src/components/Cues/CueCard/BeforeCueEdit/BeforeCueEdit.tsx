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
} from "@mantine/core";
import type { FixtureGroupConfiguration } from "../../../../types/types";
import { CheckboxCard } from "../../../CheckboxCard/CheckboxCard";
import { useState } from "react";
import { RadioCard } from "../../../RadioCard/RadioCard";
import type { CueConfig, CueMode } from "../../../../types/cues";

/**
 * This component displays a little help box when the user first creates a cue.
 * It is intended to give the user an easier time selecting what fixture groups they want to use
 */
export const BeforeCueEdit = ({
  cueConfig,
  cueNumber,
  fixtureGroups,
  onSaveCueConfig,
}: {
  cueConfig: CueConfig;
  cueNumber: number;
  fixtureGroups: FixtureGroupConfiguration[];
  onSaveCueConfig: (cueConfig: CueConfig) => void;
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
          <Button variant="subtle" color="red" size="sm">
            Delete cue
          </Button>
          <Button variant="light" size="sm" onClick={onConfirm}>
            Confirm
          </Button>
        </Group>
      </Center>
    </Stack>
  );
};
