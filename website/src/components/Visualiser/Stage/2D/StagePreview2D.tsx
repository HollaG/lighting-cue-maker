import {
  Fieldset,
  Stack,
  Flex,
  Group,
  Menu,
  Button,
  Center,
  AspectRatio,
  Box,
  Select,
  Text,
  MantineProvider,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import type Konva from "konva";
import type { KonvaEventObject, Node, NodeConfig } from "konva/lib/Node";
import { useEffect, useRef, useState, memo } from "react";
import { Layer, Stage, Text as KonvaText, Rect } from "react-konva";
import { useDeleteFixture } from "../../../../query/useDeleteFixture";
import { useGetFixtures } from "../../../../query/useGetFixtures";
import { useUpsertFixture } from "../../../../query/useUpsertFixtures";
import { useUpsertVisualiser } from "../../../../query/useUpsertVisualiser";
import type { UpsertFixtureReq, Fixture, UpdateFixtureIn2DReq } from "../../../../types/fixtures";
import type { FixtureGroupConfiguration } from "../../../../types/types";
import type { Visualiser, VisualiserObject, VisualiserTypes, VisualiserRectangle } from "../../../../types/visualiser";
import { CardBase } from "../../../Siding/CardBase";
import { VisualiserCircleObject } from "../../Elements/VisualiserCircle";
import { VisualiserLineObject } from "../../Elements/VisualiserLine";
import { VisualiserParLightObject } from "../../Elements/VisualiserParLight";
import { VisualiserRectangleObject } from "../../Elements/VisualiserRect";
import { VisualiserTextObject } from "../../Elements/VisualiserText";

import classes from "./StagePreview2D.module.css";

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
  setAllFixtures,
}: {
  fixtureGroup: FixtureGroupConfiguration;
  index: number;
  setAllFixtures: React.Dispatch<React.SetStateAction<Fixture[]>>;
}) => {
  const { fixtures } = useGetFixtures({ fixtureGroupId: fixtureGroup.id });
  const { isPending, mutateAsync: upsertFixture } = useUpsertFixture();
  const { isPending: isDeleting, mutateAsync: deleteFixture } = useDeleteFixture();

  useEffect(() => {
    setAllFixtures((prev) => {
      const otherFixtures = prev.filter((f) => f.fixtureGroupId !== fixtureGroup.id);
      return [...otherFixtures, ...fixtures];
    });
  }, [fixtures, fixtureGroup.id, setAllFixtures]);
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

export const StagePreview2D = ({
  eventId,
  visualiser,
  fixtures,
}: {
  eventId: string;
  visualiser: Visualiser;
  fixtures: Fixture[];
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const { mutateAsync: upsertVisualiser } = useUpsertVisualiser();
  const { mutate: upsertFixture } = useUpsertFixture();

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

  /** Debounce the saving of positions of stage items */
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

  /** Special: Always configure the default viewport if it doesn't exist.
   * The required values are FE-only, so it cannot be generated on the BE.
   *
   * Passing the required values back to the parent would be a bit messy
   *
   * This useEffect only runs ONCE PER created visualiser.
   */
  useEffect(() => {
    if (visualiser.defaultViewport) return; // do not configure if it already exists
    // defaultVIewport can never be set to null after configured.

    // wait for the stage to be rendered
    if (!stageRef.current) return;

    // save
    onSaveViewport();
  }, [visualiser.defaultViewport, stageRef]);

  /**
   * On first load, set the stage to the default viewport, if present.
   * Excluding the defaultViewport from the dependency array ensures this only runs once, on first load.
   *
   * This is OK (won't go from NULL to non-NULL) because of the show condition in the parent component:
   *  only a truthy value of `visualiser` results in this component being rendered.
   */
  useEffect(() => {
    if (!stageRef.current || !containerRef.current) return;

    if (!visualiser.defaultViewport) return;

    // Compare the current width and the saved width (saved width of the admin) to get a scale factor
    // const currentHeight = containerRef.current.offsetHeight;
    const currentWidth = containerRef.current.offsetWidth;
    const screenScaleFactor = currentWidth / visualiser.defaultViewport.width;

    stageRef.current.position({
      x: visualiser.defaultViewport.x * screenScaleFactor,
      y: visualiser.defaultViewport.y * screenScaleFactor,
    });
    stageRef.current.scale({
      x: visualiser.defaultViewport.scale * screenScaleFactor,
      y: visualiser.defaultViewport.scale * screenScaleFactor,
    });
  }, [stageRef.current, containerRef.current]);

  // Controlled form component: Select new element type to add
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

  // Shape select
  const [selectedId, selectShape] = useState<string | null>(null);
  const checkDeselect = (e: KonvaEventObject<MouseEvent | TouchEvent, Node<NodeConfig>>) => {
    // deselect when clicked on empty area
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      selectShape(null);
    }
  };

  // Listen to resize events and update the scaling of the stage

  /**
   * Save the current position and scale
   */
  const onSaveViewport = () => {
    const width = stageRef.current?.width() || 0;
    const height = stageRef.current?.height() || 0;

    const x = stageRef.current?.x() || 0;
    const y = stageRef.current?.y() || 0;
    const scale = stageRef.current?.scaleX() || 1;

    upsertVisualiser({
      id: visualiser.id,
      eventId,
      defaultViewport: {
        x,
        y,
        scale,
        width,
        height,
      },
    }).catch(console.error);
  };

  const onResetViewport = () => {
    if (!stageRef.current) return;

    // set x = 0, y = 0, scale = 1
    stageRef.current.position({ x: 0, y: 0 });
    stageRef.current.scale({ x: 1, y: 1 });

    // onSaveViewport();
  };

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

  // --- FIXTURE POSITIONS ---------

  /** Debounce the saving of the positions of visualiser objects */
  const debouncedSavePositions = useDebouncedCallback((newFixtureProps: UpdateFixtureIn2DReq) => {
    // Implementation for debounced position saving
    console.log("Saving fixture positions:", newFixtureProps);
    upsertFixture(newFixtureProps);
  }, 500);

  return (
    <Flex className={classes["preview-container"]}>
      {/* Height constrained to viewport minus 128px => width constrained to viewport height - 128/4*3 */}
      <Box style={{ width: "100%", maxWidth: "calc(95vh * 4/3)", minWidth: 0 }}>
        <AspectRatio ratio={4 / 3}>
          <MantineProvider
            forceColorScheme="dark"
            getRootElement={() => document.getElementById("preview-viewer") || document.body}
          >
            <Box
              id="preview-viewer"
              className={classes["preview-viewer"]}
              ref={containerRef}
              style={{ position: "relative" }}
            >
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
                  {/* Layer for the rectangle representing the default viewport */}
                  {visualiser.defaultViewport && (
                    <Layer>
                      <Rect
                        x={(-1 * visualiser.defaultViewport.x) / visualiser.defaultViewport.scale || 0}
                        y={(-1 * visualiser.defaultViewport.y) / visualiser.defaultViewport.scale || 0}
                        width={visualiser.defaultViewport.width / visualiser.defaultViewport.scale || 0}
                        height={visualiser.defaultViewport.height / visualiser.defaultViewport.scale || 0}
                        // fill="rgba(0, 0, 0, 0.1)"
                        // mantine-dark-7
                        stroke="#242424"
                        // stroke="rgb(255, 0, 0)"
                        strokeWidth={8}
                        dash={[30, 20]}
                      />
                    </Layer>
                  )}
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

                  <Layer>
                    {fixtures.map((fixture) => (
                      <VisualiserParLightObject
                        key={fixture.id}
                        onSelect={() => {}}
                        // The shapeProps here have to be derived from our fixture data
                        // for x,y,z and rotation. Remember we need tohandle the arrow.
                        fixture={fixture}
                        onChange={debouncedSavePositions}
                      />
                    ))}
                  </Layer>
                </Stage>
              ) : (
                <div style={{ width: "100%", height: "100%" }}></div>
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

              <Group style={{ position: "absolute", bottom: "1rem", right: "1rem" }}>
                <Button size="sm" onClick={onResetViewport} variant="outline" color="gray">
                  Reset view
                </Button>
                <Button size="sm" onClick={onSaveViewport} variant="light">
                  {" "}
                  Save view{" "}
                </Button>
              </Group>
            </Box>
          </MantineProvider>
        </AspectRatio>
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
