import {
  Box,
  Button,
  Center,
  Collapse,
  Container,
  FloatingIndicator,
  Group,
  Menu,
  Popover,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";

import classes from "./HomePage.module.css";
import { CustomTextInput } from "../components/CustomTextInput/CustomTextInput";
import { useNavigate } from "@tanstack/react-router";
import { IconArrowRight, IconCancel, IconCross, IconPlus, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { formatDate, getRecentEvents, type RecentEvent } from "../utils/recentEvents";
import { RichContentDemo } from "../components/RichContent/RichContentDemo";
import { CueCardDemo } from "../components/Siding/CueCard/CueCardDemo";
import { AttributeTypes, BooleanOptions, type FixtureGroupConfiguration } from "../types/types";

const HOME_STEPS = ["Create", "Mark", "Design", "Export", "Run"] as const;
type HomeStep = (typeof HOME_STEPS)[number];

export const HomePage = () => {
  const navigate = useNavigate();

  // const code = useAppStore((s) => s.code);
  // const setCode = useAppStore((s) => s.setCode);

  const [code, setCode] = useState("");
  const [isEnteringCode, setIsEnteringCode] = useState(false);
  const [activeStep, setActiveStep] = useState<HomeStep>("Create");
  const [stepsRootRef, setStepsRootRef] = useState<HTMLDivElement | null>(null);
  const [stepRefs, setStepRefs] = useState<Record<HomeStep, HTMLButtonElement | null>>({
    Create: null,
    Mark: null,
    Design: null,
    Export: null,
    Run: null,
  });

  const setStepRef = (step: HomeStep) => (node: HTMLButtonElement | null) => {
    setStepRefs((current) => (current[step] === node ? current : { ...current, [step]: node }));
  };

  const onClickHaveCode = () => {
    setIsEnteringCode(true);
  };

  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  useEffect(() => {
    setRecentEvents(getRecentEvents());
  }, []);

  return (
    <>
      <Container mt="6rem" size="xl">
        <Stack gap="xl" align="center">
          <Center>
            <Title className={classes.header} order={1} fw="700">
              {" "}
              Lighting Cue Maker{" "}
            </Title>
          </Center>
          <Center>
            <Text fz="xl" style={{ textAlign: "center" }}>
              Your all-in-one solution for creating and <br />
              managing lighting cues
            </Text>
          </Center>

          <Center>
            <Group gap={0} wrap="nowrap">
              <Button
                leftSection={<IconPlus width="1rem" />}
                color="lime.9"
                onClick={() => navigate({ to: "/events/create" })}
                mr="md"
              >
                Create new event
              </Button>

              <Popover
                position="bottom"
                withArrow
                shadow="md"
                withOverlay
                width={500}
                // opened={isEnteringCode}
                // onClose={() => setIsEnteringCode(false)}
              >
                <Popover.Target>
                  <Button variant="transparent">Have a code?</Button>
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack>
                    <Group>
                      <Box flex={1}>
                        <CustomTextInput
                          // variant="filled"
                          // size="lg"
                          label="Event code"
                          placeholder="Type code here..."
                          // value={code}
                          // onChange={(e) => setCode(e.target.value)}
                          // styles={{
                          //   input: {
                          //     textAlign: "center",
                          //   },
                          // }}
                        />
                      </Box>

                      <Button variant="subtle"> Enter </Button>
                    </Group>

                    <Text fz="sm" fw="600">
                      {" "}
                      Past events{" "}
                    </Text>
                    {recentEvents.map((evt) => (
                      <Button
                        display="flex"
                        style={{
                          height: "fit-content",
                        }}
                        styles={{
                          inner: {
                            width: "stretch",
                            justifyContent: "space-between",
                          },
                        }}
                        w="full"
                        variant="white"
                        color="black"
                        rightSection={<IconArrowRight width="1rem" />}
                        onClick={() => navigate({ to: `/events/${evt.eventId}` })}
                      >
                        <Stack align="start" flex={1} style={{ width: "100%" }} gap={0}>
                          <Text fw="600">{evt.eventName}</Text>
                          <Text c="dimmed">{formatDate(evt.lastOpenedAt)} </Text>
                        </Stack>
                      </Button>
                    ))}
                  </Stack>
                </Popover.Dropdown>
              </Popover>
              {/* <Button onClick={onClickHaveCode} rightSection={<IconArrowRight width="1rem" />} variant="transparent">
              Have a code?
            </Button>
            <CustomTextInput
              // variant="filled"
              // size="lg"
              // label="Have an event code?"
              placeholder="Type code here..."
              // value={code}
              // onChange={(e) => setCode(e.target.value)}
              // styles={{
              //   input: {
              //     textAlign: "center",
              //   },
              // }}
            /> */}
            </Group>
          </Center>

          <div className={classes.stepsRoot} ref={setStepsRootRef}>
            {HOME_STEPS.map((step) => (
              <UnstyledButton
                key={step}
                ref={setStepRef(step)}
                className={classes.stepControl}
                mod={{ active: activeStep === step }}
                onClick={() => setActiveStep(step)}
              >
                <span className={classes.stepLabel}>{step}</span>
              </UnstyledButton>
            ))}

            <FloatingIndicator target={stepRefs[activeStep]} parent={stepsRootRef} className={classes.stepIndicator} />
          </div>
        </Stack>
      </Container>

      <Container size="sm">
        <Box className={classes.content} p="lg">
          {activeStep === "Create" && <CreateSection />}
          {activeStep === "Mark" && <MarkSection />}
          {activeStep === "Design" && <DesignSection />}
          {activeStep === "Export" && <ExportSection />}
          {activeStep === "Run" && <RunSection />}
        </Box>
      </Container>
    </>
  );
};

export const CreateSection = () => {
  return (
    <>
      <Title order={2}>Create Event</Title>
      <Text>Start by creating a new event.</Text>
      <Text>Configure your venue's lighting groups, and specify the capabilities of each group.</Text>
    </>
  );
};

export const MarkSection = () => {
  const lyrics = `Life's like a road that you travel on
When there's one day here and the next day gone
Sometimes you bend, sometimes you stand
Sometimes you turn your back to the wind
There's a world outside every darkened door
Where blues won't haunt you anymore
Where the brave are free and lovers soar
Come ride with me to the distant shore

We won't hesitate
To break down the garden gate
There's not much time left today, yeah

Life is a highway
I wanna ride it all night long
If you're goin' my way
Well, I wanna drive it all night long`;
  return (
    <>
      <Title order={2}>Lyrics & Cue Marking</Title>
      <Text>Choreographers add lyrics and mark where their cue points are.</Text>
      <Text> Try clicking on a lyric or on a blank space! </Text>
      <Container mt="md">
        <RichContentDemo initialRawLyrics={lyrics} />
      </Container>
    </>
  );
};

const DEMO_FIXTURE_GROUPS: FixtureGroupConfiguration[] = [
  {
    id: "4dfd7960-4621-494d-be9d-b91fec66b14f",
    name: "Spotlights",
    attributes: [
      {
        id: "08abd32c-0789-475a-95d1-7fe79f38215d",
        name: "Intensity",
        type: "sliderPresets",
        metadata: {
          required: false,
        },
        optionPossibleValues: {
          sliderPresets: [0, 50, 100],
        },
        order: 0,
        createdAt: "2026-08-10T15:42:29.083587+08:00",
        updatedAt: "2026-08-10T15:42:29.083587+08:00",
        deletedAt: null,
      },
      {
        id: "322f2fa0-3a72-494c-be33-1fd147c27a8b",
        name: "Colour",
        type: "colour",
        metadata: {
          required: false,
        },
        optionPossibleValues: {
          colour: [
            {
              hex: "#ffffff",
              name: "White",
            },
            {
              hex: "#ffbf00",
              name: "Amber",
            },
          ],
        },
        order: 0,
        createdAt: "2026-08-10T15:42:29.083587+08:00",
        updatedAt: "2026-08-10T15:42:29.083587+08:00",
        deletedAt: null,
      },
      {
        id: "9123e0bc-a129-4ee2-a12b-2c98257dede8",
        name: "Position",
        type: "select",
        metadata: {
          required: false,
        },
        optionPossibleValues: {
          select: ["Center Stage", "Stage Left", "Stage Right", "Stage Left+Right"],
        },
        order: 0,
        createdAt: "2026-08-10T15:42:29.083587+08:00",
        updatedAt: "2026-08-10T15:42:29.083587+08:00",
        deletedAt: null,
      },
      {
        id: "00c74fe7-af90-4d1c-bfe6-ce821c5610f1",
        name: "Comments",
        type: "text",
        metadata: {
          required: false,
        },
        optionPossibleValues: {},
        order: 0,
        createdAt: "2026-08-10T15:42:29.083587+08:00",
        updatedAt: "2026-08-10T15:42:29.083587+08:00",
        deletedAt: null,
      },
    ],
    order: 0,
    createdAt: "2026-08-10T15:42:29.074473+08:00",
    updatedAt: "2026-08-10T15:42:29.074473+08:00",
    deletedAt: null,
  },
  {
    id: "949b6b0d-319f-45df-9503-b9f4bef7d4a3",
    name: "Wash",
    attributes: [
      {
        id: "5796af8b-7bd5-45a1-a831-cc991221bfd8",
        name: "Intensity",
        type: "sliderPresets",
        metadata: {
          required: false,
        },
        optionPossibleValues: {
          sliderPresets: [0, 50, 100],
        },
        order: 0,
        createdAt: "2026-08-10T15:42:29.083587+08:00",
        updatedAt: "2026-08-10T15:42:29.083587+08:00",
        deletedAt: null,
      },
      {
        id: "b0116ced-6fdb-46ba-b798-144625325ad2",
        name: "Colour",
        type: "colour",
        metadata: {
          required: false,
        },
        optionPossibleValues: {
          colour: [
            {
              hex: "#ff0000",
              name: "Red",
            },
            {
              hex: "#00ff00",
              name: "Green",
            },
            {
              hex: "#0000ff",
              name: "Blue",
            },
            {
              hex: "#00ffff",
              name: "Cyan",
            },
            {
              hex: "#ff00ff",
              name: "Magenta",
            },
            {
              hex: "#ffff00",
              name: "Yellow",
            },
          ],
        },
        order: 0,
        createdAt: "2026-08-10T15:42:29.083587+08:00",
        updatedAt: "2026-08-10T15:42:29.083587+08:00",
        deletedAt: null,
      },
      {
        id: "00fac6fb-4789-42d8-87b5-cdbb7fb05c96",
        name: "Position",
        type: "select",
        metadata: {
          required: false,
        },
        optionPossibleValues: {
          select: ["Wall Wash", "Stage Wash"],
        },
        order: 0,
        createdAt: "2026-08-10T15:42:29.083587+08:00",
        updatedAt: "2026-08-10T15:42:29.083587+08:00",
        deletedAt: null,
      },
      {
        id: "5f317a32-7aba-4e1b-aa39-530c45c019a8",
        name: "Dynamic effects",
        type: "boolean",
        metadata: {
          required: false,
        },
        optionPossibleValues: {
          boolean: "uncheckedDefault",
        },
        order: 0,
        createdAt: "2026-08-10T15:42:29.083587+08:00",
        updatedAt: "2026-08-10T15:42:29.083587+08:00",
        deletedAt: null,
      },
      {
        id: "cffdf4a5-44a9-4313-8b75-10f98878f698",
        name: "Comments",
        type: "text",
        metadata: {
          required: false,
        },
        optionPossibleValues: {},
        order: 0,
        createdAt: "2026-08-10T15:42:29.083587+08:00",
        updatedAt: "2026-08-10T15:42:29.083587+08:00",
        deletedAt: null,
      },
    ],
    order: 0,
    createdAt: "2026-08-10T15:42:29.074473+08:00",
    updatedAt: "2026-08-10T15:42:29.074473+08:00",
    deletedAt: null,
  },
];

export const DesignSection = () => {
  return (
    <>
      <Title order={2}>Design the cue</Title>
      <Text>Choreographers set up the cue based on your event configuration</Text>
      <Container mt="md">
        <CueCardDemo fixtureGroups={DEMO_FIXTURE_GROUPS} cueNumber={1} isCueSelected />
      </Container>
    </>
  );
};

export const ExportSection = () => {
  return (
    <>
      <Title order={2}>Export cue sheet</Title>
      <Text>Export the cue sheet in various formats.</Text>
      <Text>Currently, QLC+ and Google Sheets are supported.</Text>
    </>
  );
};

export const RunSection = () => {
  return (
    <>
      <Title order={2}>Run your show</Title>
      <Text>Use the Run mode to quickly run your show!</Text>
      <Text>QLC+: also trigger cues directly from the website.</Text>
    </>
  );
};
