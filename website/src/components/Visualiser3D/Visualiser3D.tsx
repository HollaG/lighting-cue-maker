import {
  AspectRatio,
  Box,
  Button,
  Code,
  Divider,
  Flex,
  Group,
  HoverCard,
  Kbd,
  MantineProvider,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import { Canvas } from "@react-three/fiber";

import type { Fixture, PositionOption } from "../../types/fixtures";
import { AttributeTypes, type FixtureGroupConfiguration } from "../../types/types";
import classes from "../Visualiser/Stage/2D/StagePreview2D.module.css";
import { Visualiser3DControls } from "./Visualiser3DControls";
import { StagePreview3D } from "./Stage3D/StagePreview3D";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Visualiser3DCameraView,
  Visualiser3DEnvironment,
  Visualiser3DObject,
  Visualiser3DObjectTypes,
} from "../../types/visualiser3d";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useUpsertVisualiser } from "../../query/useUpsertVisualiser";
import type { CameraControls } from "@react-three/drei";
import { Vector3 } from "three";
import type { Visualiser } from "../../types/visualiser";
import { useDebouncedCallback, useDebouncedValue, useDidUpdate } from "@mantine/hooks";
import { useAppStore } from "../../store/appStore";
import { GUI } from "lil-gui";
import type { AttributeAssignment, DynamicValueType, FixtureGroupsAssignment, ValueAssignment } from "../../types/cues";
import { configureVisualiser3DRenderer, createVisualiser3DRenderer } from "./visualiser3DRenderer";
import { useDeleteFixture } from "../../query/useDeleteFixture";
import { IconHelpCircle, IconRotate360, IconTransfer, IconZoomPan } from "@tabler/icons-react";

export const Visualiser3D = ({
  eventId,
  fixtureGroups,
  fixtures,
  visualiser,
}: {
  eventId: string;
  fixtures: Fixture[];
  fixtureGroups: FixtureGroupConfiguration[];
  visualiser: Visualiser;
}) => {
  // Controls (todo: save in state)
  const [environment, setEnvironment] = useState<Visualiser3DEnvironment>(
    visualiser.config3D || {
      haze: 0.5,
      ambientLight: 0.5,
    },
  );
  const [debouncedEnvironment] = useDebouncedValue(environment, 200);

  const [stageElements, setStageElements] = useState<Visualiser3DObject[]>(visualiser.objects3D || []);
  const guiContainerRef = useRef<HTMLDivElement>(null);
  const [gui, setGui] = useState<GUI | null>(null);

  useEffect(() => {
    if (!guiContainerRef.current) return;

    const instance = new GUI({
      container: guiContainerRef.current,
      title: "Selected object",
      width: 300,
    });
    setGui(instance);

    return () => instance.destroy();
  }, []);

  const { mutate: upsertVisualiser } = useUpsertVisualiser();
  const { mutate: deleteFixture } = useDeleteFixture();

  // can be either fixture ID or elemnt ID
  // const [selectedId, setSelectedElementId] = useState<string | null>(null);
  const selectedObjectId = useAppStore((state) => state.activeObjectId);
  const setSelectedObjectId = useAppStore((state) => state.setActiveObjectId);

  // Register hotkeys for element selected state
  useHotkey("Escape", () => setSelectedObjectId(null));

  const mode = useAppStore((state) => state.transformMode);
  const setMode = useAppStore((state) => state.setTransformMode);
  useHotkey("W", () => setMode("translate"));
  useHotkey("E", () => setMode("rotate"));
  useHotkey("R", () => setMode("scale"));

  // we don't have access to the controls for fixutres here, this hotkey will be registered in the StagePreview3D
  useHotkey("Delete", async () => {
    console.log("delete pressed, ", selectedObjectId);

    // could be an element OR a fixture
    if (selectedObjectId) {
      const isElement = stageElements.some((el) => el.id === selectedObjectId);
      if (isElement) {
        setStageElements((prev) => prev.filter((el) => el.id !== selectedObjectId));
        setSelectedObjectId(null);
      } else {
        const fixture = fixtures.find((f) => f.id === selectedObjectId);
        if (!fixture) {
          console.warn("Selected object is not an element or a fixture", selectedObjectId);
          return;
        }
        await deleteFixture({ fixtureId: fixture.id, fixtureGroupId: fixture.fixtureGroupId });
      }
    }
  });

  const onObjectSelect = (id: string) => {
    setSelectedObjectId(id);
  };

  const _cameraControlRef = useRef<CameraControls | null>(null);

  // Use a callback ref here so we can trigger the position setting only after that component has been loaded
  const cameraControlRef = useCallback((node: CameraControls | null) => {
    if (node) {
      _cameraControlRef.current = node;
      console.log("camera control ref set to", node);
      if (visualiser.defaultCameraView) {
        const camera = node;
        _setCameraPosition(camera, visualiser.defaultCameraView);
      }
    }
  }, []);

  /**
   * Save the view of the camera; this will be the default view for viewers
   */
  const onSaveViewport = () => {
    // somehow fetch the camera's orientation and position, and save it to the visualiser

    if (_cameraControlRef.current) {
      const camera = _cameraControlRef.current;
      const position = camera.getPosition(new Vector3());
      const target = camera.getTarget(new Vector3());
      // const fov = camera.
      console.log("camera position", position);
      console.log("camera target", target);

      upsertVisualiser({
        eventId,
        defaultCameraView: {
          position: [position.x, position.y, position.z],
          target: [target.x, target.y, target.z],
          fov: 70, // not used atm
        },
      });
    }
  };

  /**
   * Reset the camera to the last saved position
   */
  const onResetViewport = () => {
    if (_cameraControlRef.current) {
      if (visualiser.defaultCameraView) {
        const camera = _cameraControlRef.current;
        _setCameraPosition(camera, visualiser.defaultCameraView, true);
      }
    }
  };

  /**
   * Helper to set the camera position to a certain view.
   * @param camera
   * @param view
   * @param animate
   */
  const _setCameraPosition = (camera: CameraControls, view: Visualiser3DCameraView, animate?: boolean) => {
    const [x, y, z] = view.position;
    const [tx, ty, tz] = view.target;
    camera.setLookAt(x, y, z, tx, ty, tz, animate);
  };

  // --- Stage environment saving ---------
  useDidUpdate(() => {
    upsertVisualiser({
      id: visualiser.id,
      eventId,
      config3D: debouncedEnvironment,
    });
  }, [debouncedEnvironment]);

  // --- Stage element controls ---------
  const onAddElement = (elementType: Visualiser3DObjectTypes) => {
    setSelectedObjectId(null); // unselect current
    const id = crypto.randomUUID();

    // TODO: figure out where to place the new element. For now, place at origin, and we migrate the camera view over.
    let position: [number, number, number] = [0, 0, 0];
    switch (elementType) {
      case "cuboid":
        // 1 by 1 by 1 cube
        position = [0, 0.5, 0]; // place on the floor
        setStageElements((prev) => [
          ...prev,
          {
            id,
            name: "New Cuboid",
            type: "cuboid",
            props: {
              position,
              rotation: [0, 0, 0],
              size: [1, 1, 1],
              color: "#8ac",
            },
          },
        ]);
        break;
      case "default_human":
        position = [0, 1.75 / 2, 0]; // place on the floor
        setStageElements((prev) => [
          ...prev,
          {
            id,
            name: "New Human",
            type: "default_human",
            props: {
              position,
              rotation: [0, 0, 0],
              size: [1, 1, 1],
            },
          },
        ]);
        break;
      default:
        console.warn("Unknown element type", elementType);
    }

    // bring camera over
    if (_cameraControlRef.current) {
      const camera = _cameraControlRef.current;
      _setCameraPosition(
        camera,
        {
          position: [position[0], position[1] + 2, position[2] + 5],
          target: position,
          fov: 70,
        },
        true,
      );
    }

    setSelectedObjectId(id);
  };

  /**
   * Replaces the entire object with the new one.
   */
  const onUpdateElement = useCallback((newElement: Visualiser3DObject) => {
    setStageElements((prev) => {
      const index = prev.findIndex((el) => el.id === newElement.id);
      if (index === -1) {
        return [...prev, newElement];
      } else {
        const newElements = [...prev];
        newElements[index] = newElement;
        return newElements;
      }
    });
  }, []);

  const onDeleteElement = useCallback((elementId: string) => {
    setStageElements((prev) => prev.filter((el) => el.id !== elementId));
  }, []);

  const onDuplicateElement = useCallback(
    (elementId: string) => {
      // first, find existing element
      const existingElement = stageElements.find((el) => el.id === elementId);
      if (!existingElement) {
        console.warn("Cannot duplicate element, not found", elementId);
      }

      const newElement: Visualiser3DObject = {
        ...existingElement!,
        id: crypto.randomUUID(),
      };

      setStageElements((prev) => [...prev, newElement]);
      setSelectedObjectId(newElement.id);
    },
    [stageElements],
  );

  /** Debounce the saving of positions of stage items */
  const debouncedSave = useDebouncedCallback((objects3D: Visualiser3DObject[]) => {
    upsertVisualiser({
      id: visualiser.id,
      eventId,
      objects3D,
    });
  }, 500);

  useDidUpdate(() => {
    debouncedSave(stageElements);
  }, [stageElements, debouncedSave]);

  const isFixture = (selectedObjectId && fixtures.some((f) => f.id === selectedObjectId)) || false;

  const previewFixtureId = useAppStore((state) => state.previewFixtureId);
  const previewPositionId = useAppStore((state) => state.previewPositionId);
  const getIsPreviewingFixture = (fixtureId: string) => {
    return previewFixtureId === fixtureId && previewFixtureId !== null && previewPositionId !== null;
  };
  const position = useAppStore((state) => state.previewPosition) ?? { pan: 0, tilt: 0 };

  /**
   * During the configuration of the Visualiser (non-static-usecases),
   * we might want to specially apply attributes for preview purposes.
   *
   * Currently, we want to specially apply Position attribute, so that users
   * can properly configure each position setting.
   *
   * @param fixture
   * @param attribute
   */
  const getAttribute = (fixture: Fixture, attribute: AttributeTypes) => {
    if (attribute === AttributeTypes.PRESET_POSITION && getIsPreviewingFixture(fixture.id)) {
      return position;
    }
  };

  return (
    <Flex className={classes["preview-container"]}>
      <Box style={{ width: "100%", maxWidth: "calc(95vh * 4/3)", minWidth: 0 }}>
        <AspectRatio ratio={4 / 3}>
          <MantineProvider
            forceColorScheme="dark"
            getRootElement={() => document.getElementById("preview-viewer") || document.body}
          >
            <Box
              id="preview-viewer"
              className={classes["preview-viewer"]}
              // ref={containerRef}
              style={{ position: "relative", width: "100%", height: "100%" }}
            >
              <Canvas
                gl={createVisualiser3DRenderer}
                onCreated={configureVisualiser3DRenderer}
                shadows="percentage"
                camera={{ position: visualiser.defaultCameraView?.position || [0, 2, 5], fov: 70, near: 0.1, far: 100 }}

                onMouseDown={(event) => {
                  // Prevent browser middle-click autoscrolling.
                  if (event.button === 1) {
                    event.preventDefault();
                  }
                }}
                onAuxClick={(event) => {
                  if (event.button === 1) {
                    event.preventDefault();
                  }
                }}
              >
                <StagePreview3D
                  environment={environment}
                  fixtures={fixtures}
                  stageElements={stageElements}
                  selectedObjectIds={selectedObjectId ? [selectedObjectId] : undefined}
                  onObjectSelect={onObjectSelect}
                  cameraRef={cameraControlRef}

                  updateStageElement={onUpdateElement}
                  gui={gui}

                  getAttribute={getAttribute}
                />
              </Canvas>

              <Group style={{ position: "absolute", bottom: "1rem", right: "1rem" }}>
                <Button size="sm" onClick={onResetViewport} variant="outline" color="gray">
                  {" "}
                  Reset to saved view
                </Button>
                <Button size="sm" onClick={onSaveViewport} variant="light">
                  {" "}
                  Save view{" "}
                </Button>
              </Group>

              {/* Selected element controls */}
              <Stack style={{ position: "absolute", top: "1rem", right: "1rem" }}>
                <SegmentedControl
                  disabled={!selectedObjectId}
                  data={[
                    {
                      value: "translate",
                      label: (
                        <Group gap="xs" align="center" wrap="nowrap">
                          <Kbd>W</Kbd> Translate
                        </Group>
                      ),
                    },
                    {
                      value: "rotate",
                      label: (
                        <Group gap="xs" align="center" wrap="nowrap">
                          <Kbd>E</Kbd> Rotate
                        </Group>
                      ),
                    },
                    {
                      value: "scale",
                      label: (
                        <Group gap="xs" align="center" wrap="nowrap">
                          <Kbd>R</Kbd> Scale
                        </Group>
                      ),
                      disabled: isFixture, // fixtures cannot be scaled, only moved and rotated
                    },
                  ]}
                  value={mode}
                  onChange={setMode}
                ></SegmentedControl>
                {/* <Card bg={"var(--mantine-color-dark-7)"}>
                  <Stack>
                    <Text fw="bold">Position</Text>
                    <SimpleGrid
                      cols={3}
                      style={{
                        gridTemplateColumns: "repeat(3, minmax(80px, 1fr))",
                        width: "min-content",
                      }}
                    >
                      <Box>
                        <CustomTextInput step={10} type="number" label="X" rightSection="mm" />
                      </Box>
                      <Box>
                        <CustomTextInput step={10} type="number" label="Y" rightSection="mm" />
                      </Box>
                      <Box>
                        <CustomTextInput step={10} type="number" label="Z" rightSection="mm" />
                      </Box>
                    </SimpleGrid>
                    <Text fw="bold">Rotation</Text>
                    <SimpleGrid
                      cols={3}
                      style={{
                        gridTemplateColumns: "repeat(3, minmax(80px, 1fr))",
                        width: "min-content",
                      }}
                    >
                      <Box>
                        <CustomTextInput step={10} type="number" label="X" rightSection="deg" />
                      </Box>
                      <Box>
                        <CustomTextInput step={10} type="number" label="Y" rightSection="deg" />
                      </Box>
                      <Box>
                        <CustomTextInput step={10} type="number" label="Z" rightSection="deg" />
                      </Box>
                    </SimpleGrid>
                  </Stack>
                </Card> */}

                <Group gap="xs">
                  <Flex flex={1} />
                  <Button
                    color="gray"
                    size="xs"
                    bg={"var(--mantine-color-dark-7)"}
                    disabled={!selectedObjectId}
                    onClick={() => setSelectedObjectId(null)}
                  >
                    <Kbd size="xs" mr="xs">
                      ESC
                    </Kbd>{" "}
                    Deselect
                  </Button>
                  <Button
                    color="red"
                    size="xs"
                    variant="light"
                    disabled={!selectedObjectId}
                    onClick={() => selectedObjectId && onDeleteElement(selectedObjectId)}
                  >
                    <Kbd size="xs" mr="xs">
                      DEL
                    </Kbd>{" "}
                    Delete
                  </Button>
                </Group>

                <Box ref={guiContainerRef} />
              </Stack>
            </Box>
          </MantineProvider>
        </AspectRatio>
      </Box>

      <Box className={classes["preview-controls"]}>
        {
          <Visualiser3DControls
            fixtureGroups={fixtureGroups}
            eventId={eventId}
            environment={environment}
            onEnvironmentChange={setEnvironment}

            stageElements={stageElements}
            onAddElement={onAddElement}
            onDeleteElement={onDeleteElement}
            onUpdateElement={onUpdateElement}
            onDuplicateElement={onDuplicateElement}

            cameraRef={_cameraControlRef}
            visualiser={visualiser}
          />
        }
      </Box>
    </Flex>
  );
};

/**
 * A version of the Visualiser that does not allow for editing.
 * However, it does allow for camera movement.
 *
 * This is to be used within cues and within the run page.
 */
export const StaticVisualiser3D = ({
  visualiser,
  fixtures,
  // fixtureGroups,
  fixtureGroupsAssignment,
  // controls,

  // Callback to open the relevant fixture group when something is selected
  activeFixtureGroupId,
  onFixtureSelect,

  // isLoading,
  // isBlackout = false,
  controls,
}: {
  visualiser: Visualiser;
  fixtures: Fixture[];
  // fixtureGroups: FixtureGroup[];
  fixtureGroupsAssignment: FixtureGroupsAssignment;
  // controls: Visualiser3DControls;

  // Callback to open the relevant fixture group when something is selected
  activeFixtureGroupId?: string | null;
  onFixtureSelect: (fixtureId: string, fixtureGroupId: string) => void;

  isLoading: boolean;
  isBlackout?: boolean;

  controls?: React.ReactNode;
}) => {
  // Controls (todo: save in state)
  const environment = visualiser.config3D || {
    haze: 0.5,
    ambientLight: 0.5,
  }; // no need for state, no editing needed

  const _cameraControlRef = useRef<CameraControls | null>(null);

  // Use a callback ref here so we can trigger the position setting only after that component has been loaded
  const cameraControlRef = useCallback((node: CameraControls | null) => {
    if (node) {
      _cameraControlRef.current = node;
      console.log("camera control ref set to", node);
      if (visualiser.defaultCameraView) {
        const camera = node;
        _setCameraPosition(camera, visualiser.defaultCameraView);
      }
    }
  }, []);

  /**
   * Reset the camera to the last saved position
   */
  const onResetViewport = () => {
    if (_cameraControlRef.current) {
      if (visualiser.defaultCameraView) {
        const camera = _cameraControlRef.current;
        _setCameraPosition(camera, visualiser.defaultCameraView, true);
      }
    }
  };

  /**
   * Helper to set the camera position to a certain view.
   * @param camera
   * @param view
   * @param animate
   */
  const _setCameraPosition = (camera: CameraControls, view: Visualiser3DCameraView, animate?: boolean) => {
    const [x, y, z] = view.position;
    const [tx, ty, tz] = view.target;
    camera.setLookAt(x, y, z, tx, ty, tz, animate);
  };

  // Select all objects of that fixture group
  const selectedObjectIds = activeFixtureGroupId
    ? fixtures.filter((f) => f.fixtureGroupId === activeFixtureGroupId).map((f) => f.id)
    : undefined;

  // For view-only mode
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

  /**
   * Get the attributes for a given Fixture.
   *
   * Guaranteed to never return DynamicValueType.
   *
   * @param fixture
   * @param attribute
   * @returns
   */
  const getAttribute = (
    fixture: Fixture,
    attribute: AttributeTypes,
  ): Exclude<ValueAssignment[typeof attribute], DynamicValueType> | PositionOption | undefined => {
    const attributeAssignment = getSpecificAttributeGivenTheType(fixture.fixtureGroupId, attribute);

    // DynamicValueType checking
    if (attribute === AttributeTypes.PRESET_POSITION && attributeAssignment) {
      // If the attribute is a position, we need to return the position object, not just the ID
      const positionOptionId = attributeAssignment.value[AttributeTypes.PRESET_POSITION]?.id;

      if (!positionOptionId) {
        return { pan: 0, tilt: 0 } satisfies PositionOption;
      }

      return (
        visualiser.fixtureAttributeMapping[fixture.fixtureGroupId]?.[AttributeTypes.PRESET_POSITION]?.[
          positionOptionId
        ]?.[fixture.id] ?? ({ pan: 0, tilt: 0 } satisfies PositionOption)
      );
    }

    // We will never return a DynamicValueType here (checked above)
    return attributeAssignment
      ? (attributeAssignment.value[attribute] as Exclude<ValueAssignment[typeof attribute], DynamicValueType>)
      : undefined;
  };

  return (
    <Flex className={classes["preview-container"]}>
      <Box style={{ width: "100%", maxWidth: "calc(95vh * 4/3)", minWidth: 0 }}>
        <Group align="start">
          <AspectRatio flex={1} ratio={4 / 3}>
            <MantineProvider
              forceColorScheme="dark"
              getRootElement={() => document.getElementById("preview-viewer") || document.body}
            >
              <Box
                id="preview-viewer"
                className={classes["preview-viewer"]}
                // ref={containerRef}
                style={{ position: "relative", width: "100%", height: "100%" }}
              >
                <Canvas
                  frameloop="demand"
                  gl={createVisualiser3DRenderer}
                  onCreated={configureVisualiser3DRenderer}
                  shadows="percentage"
                  camera={{
                    position: visualiser.defaultCameraView?.position || [0, 2, 5],
                    fov: 70,
                    near: 0.1,
                    far: 100,
                  }}

                  onMouseDown={(event) => {
                    // Prevent browser middle-click autoscrolling.
                    if (event.button === 1) {
                      event.preventDefault();
                    }
                  }}
                  onAuxClick={(event) => {
                    if (event.button === 1) {
                      event.preventDefault();
                    }
                  }}
                >
                  <StagePreview3D
                    environment={environment}
                    fixtures={fixtures}
                    stageElements={visualiser.objects3D || []}
                    selectedObjectIds={selectedObjectIds}
                    onObjectSelect={undefined} // noop, selecting of cubiods not allowed
                    cameraRef={cameraControlRef}
                    onFixtureSelect={onFixtureSelect}

                    updateStageElement={() => {}} // noop
                    gui={null} // no GUI for static

                    isViewOnly
                    getAttribute={getAttribute}
                  />
                </Canvas>
                {/* Help button */}
                <Box style={{ position: "absolute", top: "1rem", left: "1rem" }}>
                  <HoverCard
                    position="left"
                    shadow="md"
                    styles={{
                      dropdown: {
                        backgroundColor: "var(--mantine-color-dark-6)",
                        borderColor: "var(--mantine-color-dark-4)",
                      },
                    }}
                  >
                    <HoverCard.Target>
                      <Button variant="transparent" color="white" size="sm" leftSection={<IconHelpCircle size={16} />}>
                        Help
                      </Button>
                    </HoverCard.Target>
                    <HoverCard.Dropdown
                      style={{
                        color: "white",
                      }}
                    >
                      <Stack>
                        <Group gap="xs">
                          <IconTransfer width="1rem" />
                          <Text>
                            <Code fz="md" bg="var(--mantine-color-dark-8)">
                              Right Click and Drag
                            </Code>{" "}
                            to move the view around
                          </Text>
                        </Group>
                        <Group gap="xs">
                          <IconRotate360 width="1rem" />
                          <Text>
                            <Code fz="md" bg="var(--mantine-color-dark-8)">
                              Left Click and Drag
                            </Code>{" "}
                            to rotate the view
                          </Text>
                        </Group>
                        <Group gap="xs">
                          <IconZoomPan width="1rem" />
                          <Text>
                            <Code fz="md" bg="var(--mantine-color-dark-8)">
                              Scroll
                            </Code>{" "}
                            to zoom in and out
                          </Text>
                        </Group>
                        <Divider />
                        <Text>
                          You can{" "}
                          <Code fz="md" bg="var(--mantine-color-dark-8)">
                            Left Click
                          </Code>{" "}
                          on a light to change its settings.
                        </Text>
                      </Stack>
                    </HoverCard.Dropdown>
                  </HoverCard>
                </Box>
                <Box></Box>
                <Box></Box>
                <Group style={{ position: "absolute", bottom: "1rem", right: "1rem" }}>
                  <Button size="xs" onClick={onResetViewport} variant="outline" color="gray">
                    {" "}
                    Reset view
                  </Button>
                </Group>
              </Box>
            </MantineProvider>
          </AspectRatio>
          {controls && (
            <Box className={classes["preview-controls"]}>
              {/* <VisualiserControls stageElements={stageElements} fixtureGroups={fixtureGroups} stageRef={stageRef} /> */}
              {controls}
            </Box>
          )}
        </Group>
      </Box>
    </Flex>
  );
};
