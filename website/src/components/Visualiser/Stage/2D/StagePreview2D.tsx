import { Flex, Group, Button, AspectRatio, Box, Select, MantineProvider } from "@mantine/core";
import { useDebouncedCallback, useElementSize } from "@mantine/hooks";
import type Konva from "konva";
import type { KonvaEventObject, Node, NodeConfig } from "konva/lib/Node";
import { useEffect, useId, useRef, useState } from "react";
import { Layer, Stage, Rect } from "react-konva";
import { useUpsertFixture } from "../../../../query/useUpsertFixtures";
import { useUpsertVisualiser } from "../../../../query/useUpsertVisualiser";
import type { Fixture, UpdateFixtureIn2DReq } from "../../../../types/fixtures";
import { AttributeTypes, type FixtureGroupConfiguration } from "../../../../types/types";
import type { Visualiser, VisualiserObject, VisualiserTypes, VisualiserRectangle } from "../../../../types/visualiser";
import { VisualiserCircleObject } from "../../Elements/VisualiserCircle";
import { VisualiserLineObject } from "../../Elements/VisualiserLine";
import { VisualiserParLightObject } from "../../Elements/VisualiserParLight";
import { VisualiserRectangleObject } from "../../Elements/VisualiserRect";
import { VisualiserTextObject } from "../../Elements/VisualiserText";

import classes from "./StagePreview2D.module.css";
import { VisualiserControls } from "../../Controls/VisualiserControl";
import { useAppStore } from "../../../../store/appStore";
import { VisualiserBarLightObject } from "../../Elements/VisualiserBarLight";
import { VisualiserMovingLightObject } from "../../Elements/VisualiserMovingLight";
import type { AttributeAssignment, FixtureGroupsAssignment } from "../../../../types/cues";

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
  fixtureGroups,
}: {
  eventId: string;
  visualiser: Visualiser;
  fixtures: Fixture[];
  fixtureGroups: FixtureGroupConfiguration[];
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const { mutateAsync: upsertVisualiser } = useUpsertVisualiser();
  const { mutate: upsertFixture } = useUpsertFixture();

  const setActiveObjectId = useAppStore((state) => state.setActiveObjectId);

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
  const [selectedElementType, setSelectedElementType] = useState<VisualiserTypes | null>(null);
  const onSelectElement = (elementId: VisualiserTypes | null) => {
    console.log(elementId);
    setSelectedElementType(null);

    const id = crypto.randomUUID();

    const stage = stageRef.current;
    const x = stage ? (16 - stage.x()) / stage.scaleX() : 16;
    const y = stage ? (75 - stage.y()) / stage.scaleY() : 75;

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
              x,
              y,
              width: 100,
              height: 100,
              // fill: "#eeeeee",
              stroke: "#aaaaaa",
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
              x: x + 50,
              y: y + 50,
              radius: 50,
              stroke: "#aaaaaa",
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
              x: x + 10,
              y: y + 150,
              points: [0, 0, 150, 0],
              stroke: "#aaaaaa",
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
              x: x,
              y: y,
              width: 200,
              text: "Text",
              fontSize: 24,
              fill: "#ffffff",
              id,
            },
          },
        ]);
        break;
    }
  };

  // Shape select: "Stage Elements"
  const [selectedId, setSelectedElementId] = useState<string | null>(null);
  const onSelectShape = (id: string | null) => {
    setSelectedElementId(id);
    setActiveObjectId(id);
  };

  const checkDeselect = (e: KonvaEventObject<MouseEvent | TouchEvent, Node<NodeConfig>>) => {
    // deselect when clicked on empty area
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      onSelectShape(null);
    }
  };

  const rects = stageElements.filter((el) => el.type === "rectangle");
  const circles = stageElements.filter((el) => el.type === "circle");
  const lines = stageElements.filter((el) => el.type === "line");
  const texts = stageElements.filter((el) => el.type === "text");

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
                    {/* <Rect x={20} y={50} width={100} height={100} fill="red" shadowBlur={10} draggable /> */}

                    {rects.map((rect) => (
                      // TODO: add colour, left panel selection
                      <VisualiserRectangleObject
                        key={rect.id}
                        shapeProps={rect.props}
                        isSelected={rect.id === selectedId}
                        onSelect={() => {
                          onSelectShape(rect.id);
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
                          onSelectShape(circle.id);
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
                          onSelectShape(line.id);
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
                          onSelectShape(text.id);
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
                    {fixtures.map((fixture) =>
                      fixture.type === "par" ? (
                        <VisualiserParLightObject
                          key={fixture.id}
                          isSelected={fixture.id === selectedId}
                          onSelect={() => {
                            onSelectShape(fixture.id);
                          }}
                          // The shapeProps here have to be derived from our fixture data
                          // for x,y,z and rotation. Remember we need tohandle the arrow.
                          fixture={fixture}
                          onChange={debouncedSavePositions}
                        />
                      ) : fixture.type === "bar" ? (
                        <VisualiserBarLightObject
                          key={fixture.id}
                          isSelected={fixture.id === selectedId}
                          onSelect={() => {
                            onSelectShape(fixture.id);
                          }}
                          // The shapeProps here have to be derived from our fixture data
                          // for x,y,z and rotation. Remember we need tohandle the arrow.
                          fixture={fixture}
                          onChange={debouncedSavePositions}
                        />
                      ) : fixture.type === "moving_head" ? (
                        <VisualiserMovingLightObject
                          key={fixture.id}
                          isSelected={fixture.id === selectedId}
                          onSelect={() => {
                            onSelectShape(fixture.id);
                          }}
                          // The shapeProps here have to be derived from our fixture data
                          // for x,y,z and rotation. Remember we need tohandle the arrow.
                          fixture={fixture}
                          onChange={debouncedSavePositions}
                        />
                      ) : null,
                    )}
                  </Layer>
                </Stage>
              ) : (
                <div style={{ width: "100%", height: "100%" }}></div>
              )}
              <Box style={{ position: "absolute", top: "1rem", left: "1rem" }}>
                <Select
                  value={selectedElementType}
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
                  // label="Add a shape"
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
        <VisualiserControls
          onDeleteElement={onDeleteElement}
          onUpdateElement={replaceStageElement}
          stageElements={stageElements}
          fixtureGroups={fixtureGroups}
          stageRef={stageRef}
          visualiser={visualiser}
          eventId={eventId}
        />
      </Box>
    </Flex>
  );
};

/**
 * A more lightweight version of the StagePreview without any editing capabilities.
 * Streamlined to be as efficient as possible for rendering in ~50 cues.
 *
 * @param param0
 */
export const StaticStagePreview2D = ({
  visualiser,
  fixtures,
  // fixtureGroups,
  fixtureGroupsAssignment,
  controls,
}: {
  eventId: string;
  visualiser: Visualiser;
  fixtures: Fixture[];
  fixtureGroups: FixtureGroupConfiguration[];
  fixtureGroupsAssignment: FixtureGroupsAssignment;
  controls?: React.ReactNode;
}) => {
  const { ref: containerRef, width: containerWidth, height: containerHeight } = useElementSize<HTMLDivElement>();
  const stageRef = useRef<Konva.Stage | null>(null);
  const previewId = useId();

  /**
   * Keep the saved viewport fitted to the measured preview width.
   */
  useEffect(() => {
    if (!stageRef.current || !visualiser.defaultViewport || containerWidth === 0) return;

    // Compare the current width and the saved width (saved width of the admin) to get a scale factor
    const screenScaleFactor = containerWidth / visualiser.defaultViewport.width;

    stageRef.current.position({
      x: visualiser.defaultViewport.x * screenScaleFactor,
      y: visualiser.defaultViewport.y * screenScaleFactor,
    });
    stageRef.current.scale({
      x: visualiser.defaultViewport.scale * screenScaleFactor,
      y: visualiser.defaultViewport.scale * screenScaleFactor,
    });
  }, [containerWidth, visualiser.defaultViewport]);

  const stageElements = visualiser.objects2D;
  const rects = stageElements.filter((el) => el.type === "rectangle");
  const circles = stageElements.filter((el) => el.type === "circle");
  const lines = stageElements.filter((el) => el.type === "line");
  const texts = stageElements.filter((el) => el.type === "text");

  const getAttributeAssignmentsOfAFixtureGroup = (fixtureGroupId: string): AttributeAssignment[] => {
    const fixtureGroupAssignment = fixtureGroupsAssignment[fixtureGroupId];
    if (!fixtureGroupAssignment) return [];

    return Object.values(fixtureGroupAssignment.assignment);
  };
  const getSpecificAttributeGivenTheType = (
    fixtureGroupId: string,
    attributeType: string,
  ): AttributeAssignment | undefined => {
    const assignments = getAttributeAssignmentsOfAFixtureGroup(fixtureGroupId);
    return assignments.find((assignment) => assignment.type === attributeType);
  };

  const previewFixtureId = useAppStore((state) => state.previewFixtureId);
  const previewPositionId = useAppStore((state) => state.previewPositionId);
  const isPreviewingFixture = useAppStore((state) => state.isPreviewingFixture);

  return (
    <Flex className={classes["preview-container"]}>
      {/* Height constrained to viewport minus 128px => width constrained to viewport height - 128/4*3 */}
      <Box style={{ width: "100%", maxWidth: "calc(95vh * 4/3)", minWidth: 0 }}>
        <Group align="start">
          <Box style={{ flex: 1 }}>
            <AspectRatio ratio={4 / 3}>
              <MantineProvider
                forceColorScheme="dark"
                getRootElement={() => document.getElementById(previewId) || document.body}
              >
                <Box
                  id={previewId}
                  className={classes["preview-viewer"]}
                  ref={containerRef}
                  style={{ position: "relative", width: "100%", height: "100%" }}
                >
                  {containerWidth > 0 && containerHeight > 0 ? (
                    <Stage ref={stageRef} width={containerWidth} height={containerHeight} listening={false}>
                      {/* Layer for the rectangle representing the default viewport */}
                      {visualiser.defaultViewport && (
                        <Layer listening={false}>
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
                      <Layer listening={false}>
                        {/* <Rect x={20} y={50} width={100} height={100} fill="red" shadowBlur={10} draggable /> */}

                        {rects.map((rect) => (
                          // TODO: add colour, left panel selection
                          <VisualiserRectangleObject
                            key={rect.id}
                            shapeProps={rect.props}
                            isSelected={false}
                            onSelect={() => {}}
                            onChange={() => {}}
                            viewOnly
                          />
                        ))}

                        {circles.map((circle) => (
                          <VisualiserCircleObject
                            key={circle.id}
                            shapeProps={circle.props}
                            isSelected={false}
                            onSelect={() => {}}
                            onChange={() => {}}
                            viewOnly
                          />
                        ))}

                        {lines.map((line) => (
                          <VisualiserLineObject
                            key={line.id}
                            shapeProps={line.props}
                            isSelected={false}
                            onSelect={() => {}}
                            onChange={() => {}}
                            viewOnly
                          />
                        ))}

                        {texts.map((text) => (
                          <VisualiserTextObject
                            key={text.id}
                            shapeProps={text.props}
                            isSelected={false}
                            onSelect={() => {}}
                            onChange={() => {}}
                            viewOnly
                          />
                        ))}
                        {/* <Circle x={200} y={100} radius={50} fill="green" draggable /> */}
                      </Layer>

                      <Layer listening={false}>
                        {fixtures.map((fixture) =>
                          fixture.type === "par" ? (
                            <VisualiserParLightObject
                              key={fixture.id}
                              isSelected={false}
                              onSelect={() => {}}
                              // The shapeProps here have to be derived from our fixture data
                              // for x,y,z and rotation. Remember we need tohandle the arrow.
                              fixture={fixture}
                              onChange={() => {}}
                              viewOnly

                              // These attributes are general to ALL fixture types.
                              // There are some attributes that are specific to certain fixture types, but those will be handled in the individual fixture components,
                              // NOT passed down from here.
                              colourAttribute={
                                getSpecificAttributeGivenTheType(fixture.fixtureGroupId, AttributeTypes.PRESET_COLOUR)
                                  ?.value?.[AttributeTypes.PRESET_COLOUR]
                              }
                              intensityAttribute={
                                getSpecificAttributeGivenTheType(
                                  fixture.fixtureGroupId,
                                  AttributeTypes.PRESET_INTENSITY,
                                )?.value?.[AttributeTypes.PRESET_INTENSITY]
                              }
                            />
                          ) : fixture.type === "bar" ? (
                            <VisualiserBarLightObject
                              key={fixture.id}
                              isSelected={false}
                              onSelect={() => {}}
                              // The shapeProps here have to be derived from our fixture data
                              // for x,y,z and rotation. Remember we need tohandle the arrow.
                              fixture={fixture}
                              onChange={() => {}}
                              viewOnly

                              colourAttribute={
                                getSpecificAttributeGivenTheType(fixture.fixtureGroupId, AttributeTypes.PRESET_COLOUR)
                                  ?.value?.[AttributeTypes.PRESET_COLOUR]
                              }
                              intensityAttribute={
                                getSpecificAttributeGivenTheType(
                                  fixture.fixtureGroupId,
                                  AttributeTypes.PRESET_INTENSITY,
                                )?.value?.[AttributeTypes.PRESET_INTENSITY]
                              }
                            />
                          ) : fixture.type === "moving_head" ? (
                            <VisualiserMovingLightObject
                              key={fixture.id}
                              isSelected={false}
                              onSelect={() => {}}
                              // The shapeProps here have to be derived from our fixture data
                              // for x,y,z and rotation. Remember we need tohandle the arrow.
                              fixture={fixture}
                              onChange={() => {}}
                              viewOnly

                              colourAttribute={
                                getSpecificAttributeGivenTheType(fixture.fixtureGroupId, AttributeTypes.PRESET_COLOUR)
                                  ?.value?.[AttributeTypes.PRESET_COLOUR]
                              }
                              intensityAttribute={
                                getSpecificAttributeGivenTheType(
                                  fixture.fixtureGroupId,
                                  AttributeTypes.PRESET_INTENSITY,
                                )?.value?.[AttributeTypes.PRESET_INTENSITY]
                              }
                            />
                          ) : null,
                        )}
                      </Layer>
                    </Stage>
                  ) : (
                    <div style={{ width: "100%", height: "100%" }}></div>
                  )}
                </Box>
              </MantineProvider>
            </AspectRatio>
          </Box>

          <Box className={classes["preview-controls"]}>
            {/* <VisualiserControls stageElements={stageElements} fixtureGroups={fixtureGroups} stageRef={stageRef} /> */}
            {controls}
          </Box>
        </Group>
      </Box>

      {/* <Box className={classes["preview-controls"]}>
        <VisualiserControls
          onDeleteElement={onDeleteElement}
          onUpdateElement={replaceStageElement}
          stageElements={stageElements}
          fixtureGroups={fixtureGroups}
          stageRef={stageRef}
        />
      </Box> */}
    </Flex>
  );
};
