import { Helper, SpotLight, TransformControls } from "@react-three/drei";
import type { Fixture, UpdateFixtureIn3DReq } from "../../../types/fixtures";
import type { PresetColourOption, PresetIntensityOption } from "../../../types/types";
import { useMemo, useState } from "react";

import * as THREE from "three";
import {
  convert3DPropsToFixtureRepresentation,
  getFixture3DPosition,
  getFixture3DRotation,
} from "../../../utils/visualiser";
import { useAppStore } from "../../../store/appStore";

import type { GUI } from "lil-gui";
import { useVisualiser3DGuiControls } from "./useVisualiser3DGuiControls";

export const Visualiser3DParLight = ({
  fixture,
  isSelected,
  onSelect,
  onChange,
  viewOnly = false,

  intensityAttribute,
  colourAttribute,
  gui,
}: {
  fixture: Fixture;
  isSelected: boolean;
  onSelect: (fixtureId: string) => void;
  onChange: (newProps: UpdateFixtureIn3DReq) => void;

  intensityAttribute?: PresetIntensityOption;
  colourAttribute?: PresetColourOption;
  gui: GUI | null;

  viewOnly?: boolean;
}) => {
  const [mesh, setMesh] = useState<THREE.Mesh | null>(null);
  const mode = useAppStore((state) => state.transformMode);

  const spotlightTarget = useMemo(() => new THREE.Object3D(), []);

  useVisualiser3DGuiControls({
    gui,
    object: mesh,
    isSelected: isSelected && !viewOnly,
    title: fixture.name.trim() || "Par light",
    onFinishChange: () => {
      if (mesh) onChange(convert3DPropsToFixtureRepresentation(mesh.position, mesh.rotation, fixture));
    },
  });

  return (
    <>
      <mesh
        ref={setMesh}
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

      {!viewOnly && isSelected && mesh && (
        <TransformControls
          object={mesh}
          mode={mode}
          space={mode === "translate" ? "world" : "local"}
          onMouseUp={() => {
            const _mesh = mesh;
            if (!_mesh) return;

            onChange(convert3DPropsToFixtureRepresentation(_mesh.position, _mesh.rotation, fixture));
          }}
        />
      )}
    </>
  );
};
