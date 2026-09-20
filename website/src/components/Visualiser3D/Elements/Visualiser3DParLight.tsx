import { Helper, SpotLight, TransformControls } from "@react-three/drei";
import type { Fixture, UpdateFixtureIn3DReq } from "../../../types/fixtures";
import type { PresetColourOption, PresetIntensityOption } from "../../../types/types";
import { useMemo, useRef, useState } from "react";

import * as THREE from "three";
import {
  convert3DPositionToStored,
  convert3DPropsToFixtureRepresentation,
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
        onClick={(event) => {
          event.stopPropagation();
          onSelect(fixture.id);
        }}
      >
        <cylinderGeometry args={[0.105, 0.105, 0.104, 32]} />
        <meshStandardMaterial color="#eeeeee" />

        {/* <spotLight
          position={[0, -0.052, 0]}
          target={spotlightTarget}
          intensity={150}
          angle={THREE.MathUtils.degToRad(fixture.beamAngle ? fixture.beamAngle : 15)}
          penumbra={0.5}
          distance={10}
          castShadow
        >
          {isSelected && <Helper type={THREE.SpotLightHelper} />}
        </spotLight> */}

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

        {/* <spotLight castShadow position={[0, 8, 0]} intensity={150} penumbra={1} angle={Math.PI / 12}>
          <Helper type={THREE.SpotLightHelper} />
        </spotLight> */}
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
