import { Accordion, Button, Center, Fieldset, Flex, Group, Menu, Stack, Text } from "@mantine/core";
import type { VisualiserObject } from "../../../types/visualiser";
import type { Fixture, UpsertFixtureReq } from "../../../types/fixtures";
import { CardBase } from "../../Siding/CardBase";
import { useGetFixtures } from "../../../query/useGetFixtures";
import { useUpsertFixture } from "../../../query/useUpsertFixtures";
import { useDeleteFixture } from "../../../query/useDeleteFixture";
import { useEffect, useState } from "react";
import type { FixtureGroupConfiguration } from "../../../types/types";
import { useAppStore } from "../../../store/appStore";
import type { Stage } from "konva/lib/Stage";

const ObjectMenu = ({
  obj,
  onDeleteElement,
}: {
  obj: VisualiserObject;
  onDeleteElement: (elementId: string) => void;
}) => (
  <Menu shadow="sm" width={250} alignItemsLabels="all">
    <Menu.Target>
      <Button size="xs" variant="transparent">
        Options
      </Button>
    </Menu.Target>
    <Menu.Dropdown>
      <Menu.Label>Display options</Menu.Label>
      <Menu.CheckboxItem>Stroke</Menu.CheckboxItem>
      <Menu.CheckboxItem>Fill</Menu.CheckboxItem>
      <Menu.Item>Change colour</Menu.Item>
      <Menu.Divider />
      <Menu.Item color="red" onClick={() => onDeleteElement(obj.id)}>
        Delete
      </Menu.Item>
    </Menu.Dropdown>
  </Menu>
);

const VisualiserObjectSection = ({
  title,
  itemLabel,
  objects,

  setStageElementAccordionValue,
  onDeleteElement,
}: {
  title: string;
  itemLabel: string;
  objects: VisualiserObject[];

  setStageElementAccordionValue: (value: string | null) => void;
  onDeleteElement: (elementId: string) => void;
}) => {
  // if (!objects.length) return null;

  // If the selectedElementId is IN this fixture group, expand it:
  const selectedElementId = useAppStore((state) => state.activeObjectId);

  useEffect(() => {
    if (objects.some((obj) => obj.id === selectedElementId)) {
      setStageElementAccordionValue(title);
    }
  }, [selectedElementId, setStageElementAccordionValue]); // intentional excluded some deps

  return (
    <Accordion.Item value={title}>
      <Accordion.Control>
        {title} ({objects.length})
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="xs">
          {objects.map((obj, index) => (
            <Flex key={obj.id}>
              <Text
                style={{
                  backgroundColor: selectedElementId === obj.id ? "yellow" : "transparent",
                }}
              >
                {itemLabel} {index + 1}
              </Text>

              <Flex style={{ flex: 1 }} />

              <ObjectMenu obj={obj} onDeleteElement={onDeleteElement} />
            </Flex>
          ))}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
};

const VisualiserFixtureSection = ({
  fixtureGroup,
  index,
  setFixtureAccordionValue,
  stageRef,
}: {
  fixtureGroup: FixtureGroupConfiguration;
  index: number;
  setFixtureAccordionValue: (value: string | null) => void;
  stageRef: React.RefObject<Stage | null>;
}) => {
  const selectedElementId = useAppStore((state) => state.activeObjectId);

  const { fixtures } = useGetFixtures({ fixtureGroupId: fixtureGroup.id });
  const { isPending, mutateAsync: upsertFixture } = useUpsertFixture();

  // TODO: unused var
  const { isPending: _, mutateAsync: deleteFixture } = useDeleteFixture();

  const onAddFixture = async () => {
    // upsert a new fixture with default values into the fixtures array for this fixture group
    const stage = stageRef.current;
    console.log({ stageRefs: stageRef.current, stage });
    // Convert the desired screen position to world coordinates, like the other stage elements.
    const x = stage ? (32 - stage.x()) / stage.scaleX() : 32;
    const y = stage ? (60 - stage.y()) / stage.scaleY() : 60;

    const fixture: UpsertFixtureReq = {
      ...DEFAULT_FIXTURE,
      fixtureGroupId: fixtureGroup.id,
      posX: x,
      posY: y,
    };

    // Get the stage ref
    const result = await upsertFixture(fixture);

    console.log({ result });
  };

  const onDeleteFixture = async (fixture: Fixture) => {
    await deleteFixture({ fixtureId: fixture.id, fixtureGroupId: fixture.fixtureGroupId });
  };

  // If the selectedElementId is IN this fixture group, expand it:
  useEffect(() => {
    if (fixtures.some((fixture) => fixture.id === selectedElementId)) {
      setFixtureAccordionValue(fixtureGroup.id);
    }
  }, [selectedElementId, setFixtureAccordionValue]); // intentional excluded some deps

  return (
    <Accordion.Item value={fixtureGroup.id}>
      <Accordion.Control>
        Group {index + 1}: {fixtureGroup.name} ({fixtures.length})
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="xs">
          {fixtures.map((fixture, index) => (
            <Flex key={fixture.id}>
              <Text
                style={{
                  backgroundColor: selectedElementId === fixture.id ? "yellow" : "transparent",
                }}
              >
                Static light {index + 1}
              </Text>
              <Flex flex={1} />

              <Menu shadow="sm" width={250} alignItemsLabels="all">
                <Menu.Target>
                  <Button size="xs" variant="transparent">
                    Options
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item>Static light</Menu.Item>
                  <Menu.Item>Moving light</Menu.Item>
                  <Menu.Item>Bar light</Menu.Item>

                  <Menu.Divider />
                  <Menu.Item color="red" onClick={() => onDeleteFixture(fixture)}>
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Flex>
          ))}
          <Center>
            <Button variant="subtle" size="xs" onClick={onAddFixture} loading={isPending}>
              {" "}
              Add a fixture{" "}
            </Button>
          </Center>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
};
const DEFAULT_FIXTURE: UpsertFixtureReq = {
  beamAngle: 0,

  name: " ",
  fixtureGroupId: "",
  posX: 0,
  posY: 0,
  posZ: 0,
  rotX: 0,
  rotY: 0,
  rotZ: 0,
  type: "par",
};
export const VisualisationFixtureGroupCard = ({
  fixtureGroup,
  index,
}: {
  fixtureGroup: FixtureGroupConfiguration;
  index: number;
}) => {
  const { fixtures } = useGetFixtures({ fixtureGroupId: fixtureGroup.id });
  const { isPending, mutateAsync: upsertFixture } = useUpsertFixture();
  const { isPending: isDeleting, mutateAsync: deleteFixture } = useDeleteFixture();

  const onAddFixture = async () => {
    // upsert a new fixture with default values into the fixtures array for this fixture group

    const result = await upsertFixture({ ...DEFAULT_FIXTURE, fixtureGroupId: fixtureGroup.id });

    console.log({ result });
  };

  const onDeleteFixture = async (fixture: Fixture) => {
    await deleteFixture({ fixtureId: fixture.id, fixtureGroupId: fixture.fixtureGroupId });
  };
  return (
    <CardBase key={fixtureGroup.id} isActive={false} shadow={"none"}>
      <Fieldset legend={`Group ${index + 1}: ${fixtureGroup.name}`}>
        <Stack>
          {/* some stuff here */}
          <Stack>
            {fixtures.length ? (
              fixtures.map((fixture, index) => (
                <Group key={fixture.id}>
                  <Text>Static light {index + 1}</Text>

                  <Flex flex={1} />
                  <Menu>
                    <Menu.Target>
                      <Button size="xs" variant="transparent">
                        Change type{" "}
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item>Static light</Menu.Item>
                      <Menu.Item>Moving light</Menu.Item>
                      <Menu.Item>Bar light</Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="red"
                    loading={isDeleting}
                    onClick={() => onDeleteFixture(fixture)}
                  >
                    Delete
                  </Button>
                </Group>
              ))
            ) : (
              <Center> No fixtures yet</Center>
            )}
          </Stack>

          <Center>
            <Button variant="subtle" size="xs" onClick={onAddFixture} loading={isPending}>
              {" "}
              Add a fixture{" "}
            </Button>
          </Center>
        </Stack>
      </Fieldset>
    </CardBase>
  );
};

export const VisualiserControls = ({
  onDeleteElement,
  stageElements,
  fixtureGroups,
  stageRef,
}: {
  stageElements: VisualiserObject[];
  onDeleteElement: (elementId: string) => void;
  fixtureGroups: FixtureGroupConfiguration[];
  stageRef: React.RefObject<Stage | null>;
}) => {
  const rects = stageElements.filter((el) => el.type === "rectangle");
  const circles = stageElements.filter((el) => el.type === "circle");
  const lines = stageElements.filter((el) => el.type === "line");
  const texts = stageElements.filter((el) => el.type === "text");

  const [fixtureAccordionValue, setFixtureAccordionValue] = useState<string | null>(null);
  const [stageElementAccordionValue, setStageElementAccordionValue] = useState<string | null>(null);

  return (
    // <Stack>
    //   <VisualiserObjectSection
    //     title="Rectangles"
    //     itemLabel="Rectangle"
    //     objects={rects}
    //     onDeleteElement={onDeleteElement}
    //   />
    //   <VisualiserObjectSection
    //     title="Circles"
    //     itemLabel="Circle"
    //     objects={circles}
    //     onDeleteElement={onDeleteElement}
    //   />
    //   <VisualiserObjectSection
    //     title="Lines"
    //     itemLabel="Line"
    //     objects={lines}
    //     onDeleteElement={onDeleteElement}
    //   />
    //   <VisualiserObjectSection
    //     title="Text"
    //     itemLabel="Text"
    //     objects={texts}
    //     onDeleteElement={onDeleteElement}
    //   />
    // </Stack>

    <Stack>
      <Text fw="bold"> Fixtures </Text>
      <Accordion value={fixtureAccordionValue} onChange={setFixtureAccordionValue}>
        {fixtureGroups.map((fixtureGroup, index) => (
          <VisualiserFixtureSection
            key={fixtureGroup.id}
            fixtureGroup={fixtureGroup}
            index={index}
            setFixtureAccordionValue={setFixtureAccordionValue}
            stageRef={stageRef}
          />
        ))}
      </Accordion>

      <Text fw="bold">Stage Elements</Text>
      <Accordion value={stageElementAccordionValue} onChange={setStageElementAccordionValue}>
        <VisualiserObjectSection
          key="rectangles"
          title="Rectangles"
          itemLabel="Rectangle"
          objects={rects}
          onDeleteElement={onDeleteElement}
          setStageElementAccordionValue={setStageElementAccordionValue}
        />
        <VisualiserObjectSection
          key="circles"
          title="Circles"
          itemLabel="Circle"
          objects={circles}
          onDeleteElement={onDeleteElement}
          setStageElementAccordionValue={setStageElementAccordionValue}
        />
        <VisualiserObjectSection
          key="lines"
          title="Lines"
          itemLabel="Line"
          objects={lines}
          onDeleteElement={onDeleteElement}
          setStageElementAccordionValue={setStageElementAccordionValue}
        />
        <VisualiserObjectSection
          key="texts"
          title="Text"
          itemLabel="Text"
          objects={texts}
          onDeleteElement={onDeleteElement}
          setStageElementAccordionValue={setStageElementAccordionValue}
        />
      </Accordion>
    </Stack>
  );
};
