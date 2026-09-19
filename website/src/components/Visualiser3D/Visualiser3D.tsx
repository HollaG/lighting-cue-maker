import { AspectRatio, Box, Flex } from "@mantine/core";
import { Canvas } from "@react-three/fiber";

import type { Fixture } from "../../types/fixtures";
import type { FixtureGroupConfiguration } from "../../types/types";
import classes from "../Visualiser/Stage/2D/StagePreview2D.module.css";
import { Visualiser3DControls } from "./Visualiser3DControls";
import { StagePreview3D } from "./Stage3D/StagePreview3D";
import { useState } from "react";
import type { Visualiser3DEnvironment } from "../../types/visualiser3d";
import { useHotkey } from "@tanstack/react-hotkeys";

export const Visualiser3D = ({
  eventId,
  fixtureGroups,
  fixtures,
}: {
  eventId: string;
  fixtures: Fixture[];
  fixtureGroups: FixtureGroupConfiguration[];
}) => {
  // Controls (todo: save in state)
  const [environment, setEnvironment] = useState<Visualiser3DEnvironment>({
    haze: 0.5,
    ambientLight: 0.1,
  });

  console.log({ fixtures });

  // can be either fixture ID or elemnt ID
  const [selectedId, setSelectedElementId] = useState<string | null>(null);
  const onSelectElement = (id: string) => {
    setSelectedElementId(id);
    console.log("set selected element ID to", id);
  };

  useHotkey("Escape", () => setSelectedElementId(null));

  return (
    <Flex className={classes["preview-container"]}>
      <Box style={{ width: "100%", maxWidth: "calc(95vh * 4/3)", minWidth: 0 }}>
        <AspectRatio ratio={4 / 3}>
          <Canvas
            shadows
            camera={{ position: [0, 2, 5], fov: 70, near: 0.1, far: 100 }}
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
            />
          </Canvas>
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
