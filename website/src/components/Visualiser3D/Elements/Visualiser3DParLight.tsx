import { TransformControls } from "@react-three/drei";
import type { Fixture, UpdateFixtureIn3DReq } from "../../../types/fixtures";
import type { PresetColourOption, PresetIntensityOption } from "../../../types/types";
import { useEffect, useMemo, useState } from "react";

import * as THREE from "three";
import {
  convert3DPropsToFixtureRepresentation,
  getFixture3DPosition,
  getFixture3DRotation,
} from "../../../utils/visualiser";
import { useAppStore } from "../../../store/appStore";

import type { GUI } from "lil-gui";
import { useVisualiser3DGuiControls } from "./useVisualiser3DGuiControls";
import { VOLUMETRIC_LIGHT_MASK } from "../visualiser3DRenderer";

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

  // react state for beam angle so we can dynamically update it
  const [beamAngle, setBeamAngle] = useState(fixture.beamAngle || 15);
  // ref for lil-gui: we can't directly modify beamAngle (we need another object, then we can call `onChange` and actually update the state)
  const beamControls = useMemo(() => ({ angle: fixture.beamAngle || 15 }), []);
  const mode = useAppStore((state) => state.transformMode);

  const spotlightTarget = useMemo(() => new THREE.Object3D(), []);

  // for future use - synchronise on upstream fixture.angle changes
  useEffect(() => {
    const nextBeamAngle = fixture.beamAngle || 15;
    beamControls.angle = nextBeamAngle;
    setBeamAngle(nextBeamAngle);
  }, [beamControls, fixture.beamAngle]);

  useVisualiser3DGuiControls({
    gui,
    object: mesh,
    isSelected: isSelected && !viewOnly,
    title: fixture.name.trim() || "Par light",
    addCustomControls: (folder) => {
      folder
        .addFolder("Beam")
        .add(beamControls, "angle", 1, 180, 1)
        .name("Full angle")
        .onChange(setBeamAngle) // update the react state
        .listen();
    },
    onFinishChange: () => {
      if (!mesh) return;
      onChange({
        ...convert3DPropsToFixtureRepresentation(mesh.position, mesh.rotation, fixture),
        beamAngle: beamControls.angle,
      });
    },
  });

  // Custom logic to draw
  // Intensity represents the literal intensity here. 0-100, don't need to map.
  // Colour represents the colour of the light, in hex format.
  const intensity = isSelected && !viewOnly ? 100 : intensityAttribute || 0;
  const colour = colourAttribute?.hex || "#ffffff";

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
          angle={THREE.MathUtils.degToRad(beamAngle / 2)}
          penumbra={0.5}
          distance={10}
          castShadow
        >
          {isSelected && <Helper type={THREE.SpotLightHelper} />}
        </spotLight> */}

        <spotLight
          layers-mask={VOLUMETRIC_LIGHT_MASK}
          // Include solid objects when shadows are rendered from the haze layer.
          shadow-camera-layers-mask={VOLUMETRIC_LIGHT_MASK}
          distance={20}
          position={[0, 0.052, 0]}
          target={spotlightTarget}
          intensity={intensity}
          angle={THREE.MathUtils.degToRad(beamAngle ? beamAngle / 2 : 15)}
          penumbra={0.5}
          castShadow
          color={colour}
        />

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
