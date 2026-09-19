import { AspectRatio, Box, Button, Flex, Group, MantineProvider } from "@mantine/core";
import { Canvas } from "@react-three/fiber";

import type { Fixture } from "../../types/fixtures";
import type { FixtureGroupConfiguration } from "../../types/types";
import classes from "../Visualiser/Stage/2D/StagePreview2D.module.css";
import { Visualiser3DControls } from "./Visualiser3DControls";
import { StagePreview3D } from "./Stage3D/StagePreview3D";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Visualiser3DCameraView, Visualiser3DEnvironment } from "../../types/visualiser3d";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useUpsertVisualiser } from "../../query/useUpsertVisualiser";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import type { CameraControls } from "@react-three/drei";
import { Vector3 } from "three";
import type { Visualiser } from "../../types/visualiser";

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

  const [setDefaultCameraViewAfterLoaded, setSetDefaultCameraViewAfterLoaded] = useState(false);

  const { mutate: upsertVisualiser } = useUpsertVisualiser();

  // can be either fixture ID or elemnt ID
  const [selectedId, setSelectedElementId] = useState<string | null>(null);
  const onSelectElement = (id: string) => {
    setSelectedElementId(id);
    console.log("set selected element ID to", id);
  };

  useHotkey("Escape", () => setSelectedElementId(null));

  useEffect(() => {
    RectAreaLightUniformsLib.init();
  });

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

  const onResetViewport = () => {
    if (_cameraControlRef.current) {
      if (visualiser.defaultCameraView) {
        const camera = _cameraControlRef.current;
        _setCameraPosition(camera, visualiser.defaultCameraView, true);
      }
    }
  };

  const _setCameraPosition = (camera: CameraControls, view: Visualiser3DCameraView, animate?: boolean) => {
    const [x, y, z] = view.position;
    const [tx, ty, tz] = view.target;
    camera.setLookAt(x, y, z, tx, ty, tz, animate);
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
                  selectedElementId={selectedId}
                  onFixtureSelect={onSelectElement}
                  cameraRef={cameraControlRef}
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
        />
      </Box>
    </Flex>
  );
};
