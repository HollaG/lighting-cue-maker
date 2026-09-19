import { useMemo, useRef, useState } from "react";
import type { Fixture, UpdateFixtureIn3DReq } from "../../../types/fixtures";
import type { PresetColourOption, PresetIntensityOption } from "../../../types/types";
import * as THREE from "three";
import { SpotLight, TransformControls } from "@react-three/drei";
import {
  convert3DPropsToFixtureRepresentation,
  convertStoredPositionTo3DView,
  getFixture3DPosition,
  getFixture3DRotation,
} from "../../../utils/visualiser";
import { useHotkey } from "@tanstack/react-hotkeys";

export const Visualiser3DMovingLight = ({
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

  useHotkey("W", () => setMode("translate"));
  useHotkey("E", () => setMode("rotate"));

  const spotlightTarget = useMemo(() => new THREE.Object3D(), []);

  return (
    <>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        position={getFixture3DPosition(fixture)}
        rotation={getFixture3DRotation(fixture)}
        onClick={() => onSelect(fixture.id)}
      >
        {/* Sample par, todo */}
        {/* Just a cylinder that is 210mm in diameter, 104mm in height. Modelled after Betopper LPC015 */}
        <cylinderGeometry args={[10.5 / 100, 10.5 / 100, 10.4 / 100, 32]} />
        <meshStandardMaterial color="#ff0000" />
        <SpotLight
          distance={20}
          position={[0, 0.052, 0]}
          target={spotlightTarget}
          intensity={isSelected ? 200 : 0}
          angle={THREE.MathUtils.degToRad(fixture.beamAngle ? fixture.beamAngle : 15)}
          penumbra={0.5}
          castShadow
          volumetric
          opacity={isSelected ? 4 : 0}
          // debug={isSelected}
        ></SpotLight>
        <primitive object={spotlightTarget} position={[0, 1, 0]} />
      </mesh>
      {!viewOnly && isSelected && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode={mode}
          space={mode === "translate" ? "world" : "local"}
          onMouseUp={() => {
            const mesh = meshRef.current;
            if (!mesh) return;

            onChange(convert3DPropsToFixtureRepresentation(mesh.position, mesh.rotation, fixture));
          }}
        />
      )}
    </>
  );
};
