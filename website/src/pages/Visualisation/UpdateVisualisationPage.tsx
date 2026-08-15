import {
  Box,
  Button,
  Center,
  Container,
  Fieldset,
  Flex,
  Group,
  Loader,
  Menu,
  Scroller,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useGetEvent } from "../../query/useGetEvent";
import { CardBase } from "../../components/Siding/CardBase";

import classes from "./UpdateVisualisationPage.module.css";
import { useGetFixtures } from "../../query/useGetFixtures";
import { useUpsertFixtures } from "../../query/useUpsertFixtures";
import { useDeleteFixture } from "../../query/useDeleteFixture";
import type { Fixture, UpsertFixtureReq } from "../../types/fixtures";
import { useGetOrCreateVisualiser } from "../../query/useGetOrCreateVisualiser";

import { Stage, Layer, Text as KonvaText, Circle } from "react-konva";
import { memo, useEffect, useRef, useState } from "react";
import type { Visualiser, VisualiserObject, VisualiserRectangle, VisualiserTypes } from "../../types/visualiser";
import type { KonvaEventObject, Node, NodeConfig } from "konva/lib/Node";
import { VisualiserRectangleObject } from "../../components/Konva/VisualiserRect";
import { VisualiserCircleObject } from "../../components/Konva/VisualiserCircle";
import { VisualiserLineObject } from "../../components/Konva/VisualiserLine";
import { VisualiserTextObject } from "../../components/Konva/VisualiserText";
import { useUpsertVisualiser } from "../../query/useUpsertVisualiser";
import { useDebouncedCallback } from "@mantine/hooks";
import type Konva from "konva";

export const UpdateVisualisationPage = () => {
  const { eventId } = useParams({ from: "/events/$eventId/visuals/update/" });

  const { event } = useGetEvent({ eventId });
  const { visualiser } = useGetOrCreateVisualiser({ eventId });

  const navigate = useNavigate();

  return (
    <Container size="xl" mt="4rem">
      <Group mb="2rem">
        <Button
          type="button"
          leftSection={<IconArrowLeft width="1rem" />}
          variant="transparent"
          onClick={() => navigate({ to: `/events/${eventId}` })}
        >
          Back to event
        </Button>
      </Group>
      {event && visualiser ? (
        <Stack style={{ position: "relative" }}>
          <Title>
            Create visualisation for <span style={{ textDecoration: "underline" }}>{event?.name}</span>
          </Title>

          <Scroller>
            <Group style={{ flexWrap: "nowrap" }}>
              {event.fixtureGroups.map((fixtureGroup, index) => (
                <FixtureGroupCard key={fixtureGroup.id} fixtureGroup={fixtureGroup} index={index} />
              ))}
            </Group>
          </Scroller>

          <StagePreview2D eventId={eventId} visualiser={visualiser} />
        </Stack>
      ) : (
        <Center>
          <Loader />{" "}
        </Center>
      )}
    </Container>
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
const FixtureGroupCard = ({ fixtureGroup, index }: { fixtureGroup: any; index: number }) => {
  const { fixtures } = useGetFixtures({ fixtureGroupId: fixtureGroup.id });
  const { isPending, mutateAsync: upsertFixture } = useUpsertFixtures();
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
        <Stack style={{ minWidth: "450px" }}>
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

// Pre-generate grid dots
const gridDots: { x: number; y: number }[] = [];
const spacing = 24;
const range = 2000;
for (var gx = -range; gx <= range; gx += spacing) {
  for (var gy = -range; gy <= range; gy += spacing) {
    gridDots.push({ x: gx, y: gy });
  }
}

const StagePreview2D = ({ eventId, visualiser }: { eventId: string; visualiser: Visualiser }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const { mutateAsync: upsertVisualiser } = useUpsertVisualiser();

  const [stageElements, setStageElements] = useState<VisualiserObject[]>(visualiser.objects2D);
  const replaceStageElement = (newElement: VisualiserObject) => {
    setStageElements((prev) => {
      const index = prev.findIndex((el) => el.id === newElement.id);
      if (index === -1) {
        return [...prev, newElement];
      }
      const newElements = [...prev];
      newElements[index] = newElement;
      return newElements;
    });
  };

  const onDeleteElement = (elementId: string) => {
    setStageElements((prev) => prev.filter((el) => el.id !== elementId));
  };

  const debouncedSave = useDebouncedCallback((objects2D: VisualiserObject[]) => {
    upsertVisualiser({
      id: visualiser.id,
      eventId,
      objects2D,
    });
  }, 500);

  useEffect(() => {
    debouncedSave(stageElements);
  }, [stageElements, debouncedSave]);

  console.log({ stageElements });
  const [selectedElementId, setSelectedElementId] = useState<VisualiserTypes | null>(null);
  const onSelectElement = (elementId: VisualiserTypes | null) => {
    console.log(elementId);
    setSelectedElementId(null);

    const id = crypto.randomUUID();

    switch (elementId) {
      case "rectangle":
        // Handle rectangle selection

        setStageElements((prev) => [
          ...prev,
          {
            id,
            name: "Rectangle",
            type: "rectangle",
            props: {
              x: 10,
              y: 10,
              width: 100,
              height: 100,
              // fill: "#eeeeee",
              stroke: "#eeeeee",
              id,
            },
          } as VisualiserRectangle,
        ]);
        break;
      case "circle":
        // Handle circle selection
        setStageElements((prev) => [
          ...prev,
          {
            id,
            name: "Circle",
            type: "circle",
            props: {
              x: 10 + 50,
              y: 10 + 50,
              radius: 50,
              stroke: "#eeeeee",
              strokeWidth: 2,
              id,
            },
          },
        ]);

        break;
      case "line":
        setStageElements((prev) => [
          ...prev,
          {
            id,
            name: "Line",
            type: "line",
            props: {
              x: 10,
              y: 150,
              points: [0, 0, 150, 0],
              stroke: "#eeeeee",
              strokeWidth: 2,
              lineCap: "round",
              id,
            },
          },
        ]);
        break;

      case "text":
        setStageElements((prev) => [
          ...prev,
          {
            id,
            name: "Text",
            type: "text",
            props: {
              x: 10,
              y: 180,
              width: 200,
              text: "Text",
              fontSize: 24,
              fill: "#eeeeee",
              id,
            },
          },
        ]);
        break;
    }
  };

  const rects = stageElements.filter((el) => el.type === "rectangle");
  const circles = stageElements.filter((el) => el.type === "circle");
  const lines = stageElements.filter((el) => el.type === "line");
  const texts = stageElements.filter((el) => el.type === "text");

  const [selectedId, selectShape] = useState<string | null>(null);
  const checkDeselect = (e: KonvaEventObject<MouseEvent | TouchEvent, Node<NodeConfig>>) => {
    // deselect when clicked on empty area
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      selectShape(null);
    }
  };

  /**
   * Save the current position and scale
   */
  const onSaveViewport = () => {};

  const ObjectMenu = memo(
    ({ obj }: { obj: VisualiserObject }) => {
      return (
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
            <Menu.Item> Change colour </Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red" onClick={() => onDeleteElement(obj.id)}>
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      );
    },
    (prev, next) => prev.obj.id === next.obj.id,
  );
  let scaleBy = 1.05;
  const handleWheel = function (e: KonvaEventObject<WheelEvent, Node<NodeConfig>>) {
    if (!stageRef.current) return;
    e.evt.preventDefault();
    var stage = stageRef.current;
    var oldScale = stage.scaleX();
    var pointer = stage.getPointerPosition();

    if (!pointer) return;
    var mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    var direction = e.evt.deltaY > 0 ? -1 : 1;
    if (e.evt.ctrlKey) {
      direction = -direction;
    }
    var newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = Math.max(0.1, Math.min(10, newScale));
    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  return (
    <Flex className={classes["preview-container"]}>
      <Box className={classes["preview-viewer"]} ref={containerRef} style={{ position: "relative" }}>
        {/* Load the container ref so we can set the widths appropriately */}
        {containerRef.current ? (
          <Stage
            draggable
            onWheel={handleWheel}
            ref={stageRef}
            width={containerRef.current?.offsetWidth || window.innerWidth}
            height={containerRef.current?.offsetHeight || window.innerHeight}
            onMouseDown={checkDeselect}
            onTouchStart={checkDeselect}
          >
            {/* <Layer>
              {gridDots.map(function (d, i) {
                return <Circle key={"g" + i} x={d.x} y={d.y} radius={1} fill="#424242" listening={false} />;
              })}
            </Layer> */}
            <Layer>
              <KonvaText text="Try to drag shapes" fontSize={15} />
              {/* <Rect x={20} y={50} width={100} height={100} fill="red" shadowBlur={10} draggable /> */}

              {rects.map((rect) => (
                // TODO: add colour, left panel selection
                <VisualiserRectangleObject
                  key={rect.id}
                  shapeProps={rect.props}
                  isSelected={rect.id === selectedId}
                  onSelect={() => {
                    selectShape(rect.id);
                  }}
                  onChange={(newAttrs) => {
                    const existingRect = rects.find((r) => r.id === rect.id);
                    if (!existingRect) return;

                    replaceStageElement({
                      ...existingRect,
                      props: newAttrs,
                    });
                  }}
                />
              ))}

              {circles.map((circle) => (
                <VisualiserCircleObject
                  key={circle.id}
                  shapeProps={circle.props}
                  isSelected={circle.id === selectedId}
                  onSelect={() => {
                    selectShape(circle.id);
                  }}
                  onChange={(newAttrs) => {
                    const existingCircle = circles.find((c) => c.id === circle.id);
                    if (!existingCircle) return;
                    replaceStageElement({
                      ...existingCircle,
                      props: newAttrs,
                    });
                  }}
                />
              ))}

              {lines.map((line) => (
                <VisualiserLineObject
                  key={line.id}
                  shapeProps={line.props}
                  isSelected={line.id === selectedId}
                  onSelect={() => {
                    selectShape(line.id);
                  }}
                  onChange={(newAttrs) => {
                    replaceStageElement({
                      ...line,
                      props: newAttrs,
                    });
                  }}
                />
              ))}

              {texts.map((text) => (
                <VisualiserTextObject
                  key={text.id}
                  shapeProps={text.props}
                  isSelected={text.id === selectedId}
                  onSelect={() => {
                    selectShape(text.id);
                  }}
                  onChange={(newAttrs) => {
                    replaceStageElement({
                      ...text,
                      props: newAttrs,
                    });
                  }}
                />
              ))}
              {/* <Circle x={200} y={100} radius={50} fill="green" draggable /> */}
            </Layer>
          </Stage>
        ) : (
          <div />
        )}
        <Box style={{ position: "absolute", top: "1rem", right: "1rem" }}>
          <Select
            value={selectedElementId}
            onChange={(v: VisualiserTypes | null) => onSelectElement(v)}
            data={[
              {
                value: "rectangle",
                label: "Rectangle",
              },
              {
                value: "circle",
                label: "Circle",
              },
              {
                value: "line",
                label: "Line",
              },
              {
                value: "text",
                label: "Text",
              },
            ]}
            label="Add a shape"
            placeholder="Select a shape to add"
          />
        </Box>
      </Box>
      <Box className={classes["preview-controls"]}>
        <Stack>
          {rects.length ? (
            <>
              <Text fw="bold"> Rectangles </Text>
              <Stack gap="xs">
                {rects.map((rect, index) => (
                  <Flex key={rect.id}>
                    <Text style={{ flex: 1 }}>Rectangle {index + 1}</Text>
                    <ObjectMenu obj={rect} />
                  </Flex>
                ))}
              </Stack>
            </>
          ) : (
            <></>
          )}

          {circles.length ? (
            <>
              <Text fw="bold"> Circles </Text>
              <Stack gap="xs">
                {circles.map((circle, index) => (
                  <Group key={circle.id}>
                    <Text style={{ flex: 1 }}>Circle {index + 1}</Text>
                    <ObjectMenu obj={circle} />
                  </Group>
                ))}
              </Stack>
            </>
          ) : (
            <></>
          )}

          {lines.length ? (
            <>
              <Text fw="bold"> Lines </Text>
              <Stack gap="xs">
                {lines.map((line, index) => (
                  <Flex key={line.id}>
                    <Text style={{ flex: 1 }}>Line {index + 1}</Text>
                    <ObjectMenu obj={line} />
                  </Flex>
                ))}
              </Stack>
            </>
          ) : (
            <></>
          )}

          {texts.length ? (
            <>
              <Text fw="bold"> Text </Text>
              <Stack gap="xs">
                {texts.map((text, index) => (
                  <Flex key={text.id}>
                    <Text style={{ flex: 1 }}>Text {index + 1}</Text>
                    <ObjectMenu obj={text} />
                  </Flex>
                ))}
              </Stack>
            </>
          ) : (
            <></>
          )}
        </Stack>
      </Box>
    </Flex>
  );
};
