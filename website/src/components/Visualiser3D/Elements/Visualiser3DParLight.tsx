import { TransformControls } from "@react-three/drei";
import type { Fixture, UpdateFixtureIn3DReq } from "../../../types/fixtures";
import type { PresetColourOption, PresetIntensityOption } from "../../../types/types";
import { useRef, useState } from "react";

import * as THREE from "three";
import {
  convert3DPositionToStored,
  convert3DRotationToStored,
  getFixture3DPosition,
  getFixture3DRotation,
} from "../../../utils/visualiser";
import { useHotkey } from "@tanstack/react-hotkeys";

export const Visualiser3DParLight = ({
  fixture,
  isSelected,
  onSelect,
  onChange,
  viewOnly = false,

  intensityAttribute,
  colourAttribute,
}: {
  fixture: Fixture;
  isSelected: boolean;
  onSelect: (fixtureId: string) => void;
  onChange: (newProps: UpdateFixtureIn3DReq) => void;

  intensityAttribute?: PresetIntensityOption;
  colourAttribute?: PresetColourOption;

  viewOnly?: boolean;
}) => {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const [mode, setMode] = useState<"translate" | "rotate">("translate");

  useHotkey("T", () => setMode("translate"));
  useHotkey("R", () => setMode("rotate"));

  return (
    <>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        position={getFixture3DPosition(fixture)}
        rotation={getFixture3DRotation(fixture)}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(fixture.id);
        }}
      >
        <cylinderGeometry args={[0.105, 0.105, 0.104, 32]} />
        <meshPhongMaterial color="#eeeeee" />
      </mesh>

      {!viewOnly && isSelected && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode={mode}
          space={mode === "translate" ? "world" : "local"}
          onMouseUp={() => {
            const mesh = meshRef.current;
            if (!mesh) return;

            const [x, y, z] = convert3DPositionToStored([mesh.position.x, mesh.position.y, mesh.position.z]);
            const [rotX, rotY, rotZ] = convert3DRotationToStored([mesh.rotation.x, mesh.rotation.y, mesh.rotation.z]);
            onChange({
              ...fixture,
            });
          }}
        />
      )}
    </>
  );
};
