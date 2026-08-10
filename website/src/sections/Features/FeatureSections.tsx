import { Box, Center, Container, Flex, Image, Select, Text, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import LED_PAR_IMAGE from "../../assets/par_example.png";
import MH_IMAGE from "../../assets/mh_example.png";
import {
  createEmptyEventFormAttribute,
  createEmptyEventFormFixtureGroup,
  createEmptyEventFormValues,
  type EventFormValues,
} from "../../components/EventForm/eventFormModel";
import { FixtureGroupCard } from "../../components/FixtureGroup/FixtureGroupCard";
import { RichContentDemo } from "../../components/RichContent/RichContentDemo";
import { CueCardDemo } from "../../components/Siding/CueCard/CueCardDemo";
import type { FixtureGroupConfiguration } from "../../types/types";

const movingHeadFormValues = {
  ...createEmptyEventFormValues(),
  fixtureGroups: {
    mhGroup: {
      ...createEmptyEventFormFixtureGroup(0),
      attributeOrder: ["1", "2", "3", "4"],
      name: "Spotlight Moving Heads",
    },
  },
};

movingHeadFormValues.fixtureGroups.mhGroup.attributes["1"] = {
  ...createEmptyEventFormAttribute(0),
  name: "Intensity",
  type: "sliderPresets",
  optionPossibleValues: { sliderPresets: ["0", "50", "100"] },
};
movingHeadFormValues.fixtureGroups.mhGroup.attributes["2"] = {
  ...createEmptyEventFormAttribute(1),
  name: "Position",
  type: "select",
  optionPossibleValues: { select: ["Center Stage", "Stage Left", "Stage Right", "Stage Left+Right"] },
};
movingHeadFormValues.fixtureGroups.mhGroup.attributes["3"] = {
  ...createEmptyEventFormAttribute(2),
  name: "Gobo",
  type: "select",
  optionPossibleValues: { select: ["Flowers", "Circles", "Cross", "Squares", "Beam"] },
};
movingHeadFormValues.fixtureGroups.mhGroup.attributes["4"] = {
  ...createEmptyEventFormAttribute(3),
  name: "Comments",
  type: "text",
};

const ledFormValues = {
  ...createEmptyEventFormValues(),
  fixtureGroups: {
    ledGroup: {
      ...createEmptyEventFormFixtureGroup(0),
      attributeOrder: ["1", "2", "3", "4"],
      name: "LED RGB Pars",
    },
  },
};

ledFormValues.fixtureGroups.ledGroup.attributes["1"] = {
  ...createEmptyEventFormAttribute(0),
  name: "Intensity",
  type: "sliderPresets",
  optionPossibleValues: { sliderPresets: ["0", "50", "100"] },
};
ledFormValues.fixtureGroups.ledGroup.attributes["2"] = {
  ...createEmptyEventFormAttribute(1),
  name: "Colour",
  type: "colour",
  optionPossibleValues: {
    colour: [
      { hex: "#ffffff", name: "White" },
      { hex: "#ff0000", name: "Red" },
      { hex: "#00ff00", name: "Green" },
      { hex: "#0000ff", name: "Blue" },
      { hex: "#00ffff", name: "Cyan" },
      { hex: "#ff00ff", name: "Magenta" },
      { hex: "#ffff00", name: "Yellow" },
    ],
  },
};
ledFormValues.fixtureGroups.ledGroup.attributes["3"] = {
  ...createEmptyEventFormAttribute(2),
  name: "Dynamic effects?",
  type: "boolean",
  optionPossibleValues: { boolean: "uncheckedDefault" },
};
ledFormValues.fixtureGroups.ledGroup.attributes["4"] = {
  ...createEmptyEventFormAttribute(3),
  name: "Comments",
  type: "text",
};

export const CreateSection = () => {
  const [lightGroup, setLightGroup] = useState<string | null>("mh");
  const movingHeadForm = useForm<EventFormValues>({ initialValues: movingHeadFormValues });
  const ledForm = useForm<EventFormValues>({ initialValues: ledFormValues });
  const onDeleteFixtureGroup = () => {};

  return (
    <>
      <Title order={2}>Create Event</Title>
      <Text>Start by creating a new event.</Text>
      <Text>Configure your venue's lighting groups, and specify the capabilities of each group.</Text>
      <Center my="lg">
        <Select
          allowDeselect={false}
          label="Light Group"
          value={lightGroup}
          onChange={setLightGroup}
          data={[
            { label: "Spotlight Moving Heads", value: "mh" },
            { label: "LED RGB Pars", value: "led" },
          ]}
        />
      </Center>
      <Flex>
        <Flex flex={3}>
          <Box style={{ padding: "4rem", display: "flex", justifyContent: "center", alignItems: "center" }}>
            {lightGroup === "led" && <Image mah="450px" src={LED_PAR_IMAGE} alt="LED PAR Example" w="100%" fit="contain" />}
            {lightGroup === "mh" && <Image mah="450px" src={MH_IMAGE} alt="Moving Head Example" w="100%" fit="contain" />}
          </Box>
        </Flex>
        <Flex flex={9}>
          <Box>
            <Box display={lightGroup === "led" ? "block" : "none"}>
              <FixtureGroupCard formKey="ledGroup" form={ledForm} index={1} onDeleteFixtureGroup={onDeleteFixtureGroup} />
            </Box>
            <Box display={lightGroup === "mh" ? "block" : "none"}>
              <FixtureGroupCard formKey="mhGroup" form={movingHeadForm} index={0} onDeleteFixtureGroup={onDeleteFixtureGroup} />
            </Box>
          </Box>
        </Flex>
      </Flex>
    </>
  );
};

const DEMO_LYRICS = `Life's like a road that you travel on
When there's one day here and the next day gone
Sometimes you bend, sometimes you stand
Sometimes you turn your back to the wind

Life is a highway
I wanna ride it all night long
If you're goin' my way
Well, I wanna drive it all night long`;

export const MarkSection = () => (
  <>
    <Title order={2}>Lyrics & Cue Marking</Title>
    <Text>Choreographers add lyrics and mark where their cue points are.</Text>
    <Text>Try clicking on a lyric or on a blank space!</Text>
    <Box mt="xl">
      <RichContentDemo initialRawLyrics={DEMO_LYRICS} />
    </Box>
  </>
);

const DEMO_FIXTURE_GROUPS: FixtureGroupConfiguration[] = [
  {
    id: "mhGroup",
    name: "Spotlight Moving Heads",
    order: 0,
    attributes: [
      {
        id: "1",
        name: "Intensity",
        type: "sliderPresets",
        metadata: { required: false },
        optionPossibleValues: { sliderPresets: [0, 50, 100] },
        order: 0,
      },
      {
        id: "2",
        name: "Position",
        type: "select",
        metadata: { required: false },
        optionPossibleValues: { select: ["Center Stage", "Stage Left", "Stage Right", "Stage Left+Right"] },
        order: 1,
      },
      {
        id: "3",
        name: "Gobo",
        type: "select",
        metadata: { required: false },
        optionPossibleValues: { select: ["Flowers", "Circles", "Cross", "Squares", "Beam"] },
        order: 2,
      },
      { id: "4", name: "Comments", type: "text", metadata: { required: false }, optionPossibleValues: {}, order: 3 },
    ],
  },
  {
    id: "ledGroup",
    name: "LED RGB Pars",
    order: 1,
    attributes: [
      {
        id: "1",
        name: "Intensity",
        type: "sliderPresets",
        metadata: { required: false },
        optionPossibleValues: { sliderPresets: [0, 50, 100] },
        order: 0,
      },
      {
        id: "2",
        name: "Colour",
        type: "colour",
        metadata: { required: false },
        optionPossibleValues: {
          colour: [
            { hex: "#ffffff", name: "White" },
            { hex: "#ff0000", name: "Red" },
            { hex: "#00ff00", name: "Green" },
            { hex: "#0000ff", name: "Blue" },
            { hex: "#00ffff", name: "Cyan" },
            { hex: "#ff00ff", name: "Magenta" },
            { hex: "#ffff00", name: "Yellow" },
          ],
        },
        order: 1,
      },
      {
        id: "3",
        name: "Dynamic effects?",
        type: "boolean",
        metadata: { required: false },
        optionPossibleValues: { boolean: "uncheckedDefault" },
        order: 2,
      },
      { id: "4", name: "Comments", type: "text", metadata: { required: false }, optionPossibleValues: {}, order: 3 },
    ],
  },
];

export const DesignSection = () => (
  <>
    <Title order={2}>Design the cue</Title>
    <Text>Choreographers set up the cue based on your event configuration</Text>
    <Container mt="md">
      <CueCardDemo fixtureGroups={DEMO_FIXTURE_GROUPS} cueNumber={1} isCueSelected />
    </Container>
  </>
);

export const ExportSection = () => (
  <>
    <Title order={2}>Export cue sheet</Title>
    <Text>Export the cue sheet in various formats.</Text>
    <Text>Currently, QLC+ and Google Sheets are supported.</Text>
  </>
);

export const RunSection = () => (
  <>
    <Title order={2}>Run your show</Title>
    <Text>Use the Run mode to quickly run your show!</Text>
    <Text>QLC+: also trigger cues directly from the website.</Text>
  </>
);
