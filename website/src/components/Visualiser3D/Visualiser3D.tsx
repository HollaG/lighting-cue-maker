import { AspectRatio, Box, Button, Flex, Group, Kbd, MantineProvider, SegmentedControl, Stack } from "@mantine/core";
import { Canvas } from "@react-three/fiber";

import type { Fixture } from "../../types/fixtures";
import type { FixtureGroupConfiguration } from "../../types/types";
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
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import type { CameraControls } from "@react-three/drei";
import { Vector3 } from "three";
import type { Visualiser } from "../../types/visualiser";
import { useDebouncedCallback } from "@mantine/hooks";
import { useAppStore } from "../../store/appStore";

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
  const [environment, setEnvironment] = useState<Visualiser3DEnvironment>({
    haze: 0.5,
    ambientLight: 0.5,
  });

  const [stageElements, setStageElements] = useState<Visualiser3DObject[]>(visualiser.objects3D || []);

  const { mutate: upsertVisualiser } = useUpsertVisualiser();

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

  // Necessary for RectAreaLight to work.
  useEffect(() => {
    RectAreaLightUniformsLib.init();
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

  // --- Stage element controls ---------
  const onAddElement = (elementType: Visualiser3DObjectTypes) => {
    setSelectedObjectId(null); // unselect current
    const id = crypto.randomUUID();

    // TODO: figure out where to place the new element. For now, place at origin, and we migrate the camera view over.
    switch (elementType) {
      case "cuboid":
        // 1 by 1 by 1 cube
        setStageElements((prev) => [
          ...prev,
          {
            id,
            name: "New Cuboid",
            type: "cuboid",
            props: {
              position: [0, 0.5, 0],
              rotation: [0, 0, 0],
              size: [1, 1, 1],
              color: "#ffffff",
            },
          },
        ]);
        break;
      case "default_human":
        setStageElements((prev) => [
          ...prev,
          {
            id,
            name: "New Human",
            type: "default_human",
            props: {
              position: [0, 1.75 / 2, 0],
              rotation: [0, 0, 0],
              size: [1, 1, 1],
            },
          },
        ]);
        break;
      default:
        console.warn("Unknown element type", elementType);
    }
  };

  /**
   * Replaces the entire object with the new one.
   */
  const updateStageElement = useCallback((newElement: Visualiser3DObject) => {
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

  const removeStageElement = useCallback((elementId: string) => {
    setStageElements((prev) => prev.filter((el) => el.id !== elementId));
  }, []);

  /** Debounce the saving of positions of stage items */
  const debouncedSave = useDebouncedCallback((objects3D: Visualiser3DObject[]) => {
    upsertVisualiser({
      id: visualiser.id,
      eventId,
      objects3D,
    });
  }, 500);

  useEffect(() => {
    debouncedSave(stageElements);
  }, [stageElements, debouncedSave]);

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
                shadows
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
                  selectedElementId={selectedObjectId}
                  onObjectSelect={onObjectSelect}
                  cameraRef={cameraControlRef}

                  updateStageElement={updateStageElement}
                />
              </Canvas>

              <Box></Box>
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
                    },
                  ]}
                  value={mode}
                  onChange={setMode}
                ></SegmentedControl>
              </Stack>
            </Box>
          </MantineProvider>
        </AspectRatio>
      </Box>

      <Box className={classes["preview-controls"]}>
        <Visualiser3DControls
          fixtureGroups={fixtureGroups}
          eventId={eventId}
          environment={environment}
          onEnvironmentChange={setEnvironment}

          stageElements={stageElements}
          onAddElement={onAddElement}
        />
      </Box>
    </Flex>
  );
};
