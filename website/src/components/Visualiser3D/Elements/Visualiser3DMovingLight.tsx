import { useMemo, useState } from "react";
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
import { useAppStore } from "../../../store/appStore";

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
  const [mesh, setMesh] = useState<THREE.Mesh | null>(null);

  const mode = useAppStore((state) => state.transformMode);

  const spotlightTarget = useMemo(() => new THREE.Object3D(), []);

  return (
    <>
      <mesh
        ref={setMesh}
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
      {!viewOnly && isSelected && mesh && (
        <TransformControls
          object={mesh}
          mode={mode}
          space={mode === "translate" ? "world" : "local"}
          onMouseUp={() => {
            onChange(convert3DPropsToFixtureRepresentation(mesh.position, mesh.rotation, fixture));
          }}
        />
      )}
    </>
  );
};
