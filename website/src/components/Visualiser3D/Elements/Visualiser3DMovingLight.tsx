import { useEffect, useMemo, useRef, useState } from "react";
import type { Fixture, UpdateFixtureIn3DReq } from "../../../types/fixtures";
import type { PresetColourOption, PresetIntensityOption } from "../../../types/types";
import * as THREE from "three";
import { Visualiser3DTransformControls } from "./Visualiser3DTransformControls";
import {
  convert3DPropsToFixtureRepresentation,
  getFixture3DPosition,
  getFixture3DRotation,
} from "../../../utils/visualiser";
import { useAppStore } from "../../../store/appStore";
import type { GUI } from "lil-gui";
import { useVisualiser3DGuiControls } from "./useVisualiser3DGuiControls";
import { VOLUMETRIC_LIGHT_MASK } from "../visualiser3DRenderer";

export const Visualiser3DMovingLight = ({
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
  const [beamAngle, setBeamAngle] = useState(fixture.beamAngle || 15);
  const beamControls = useMemo(() => ({ angle: fixture.beamAngle || 15 }), []);

  const mode = useAppStore((state) => state.transformMode);
  const setMode = useAppStore((state) => state.setTransformMode);

  const spotlightTarget = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const nextBeamAngle = fixture.beamAngle || 15;
    beamControls.angle = nextBeamAngle;
    setBeamAngle(nextBeamAngle);
  }, [beamControls, fixture.beamAngle]);

  useVisualiser3DGuiControls({
    gui,
    object: mesh,
    isSelected: isSelected && !viewOnly,
    title: fixture.name.trim() || "Moving head",
    addCustomControls: (folder) => {
      folder.addFolder("Beam").add(beamControls, "angle", 1, 180, 1).name("Full angle").onChange(setBeamAngle).listen();
    },
    onFinishChange: () => {
      if (!mesh) return;
      onChange({
        ...convert3DPropsToFixtureRepresentation(mesh.position, mesh.rotation, fixture),
        beamAngle: beamControls.angle,
      });
    },
  });

  // Force the fixture to not change mode
  const oldMode = useRef(mode);
  useEffect(() => {
    if (!isSelected) return;
    if (isSelected && mode === "scale") setMode(oldMode.current);
    if (mode === "scale" && mode !== oldMode.current) {
      // force set it back
      setMode(oldMode.current);
    } else {
      oldMode.current = mode;
    }
  }, [mode, isSelected]);

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
        {/* Sample par, todo */}
        {/* Just a cylinder that is 210mm in diameter, 104mm in height. Modelled after Betopper LPC015 */}
        <cylinderGeometry args={[10.5 / 100, 10.5 / 100, 10.4 / 100, 32]} />
        <meshStandardMaterial color="#ff0000" />
        <spotLight
          layers-mask={VOLUMETRIC_LIGHT_MASK}
          // Include solid objects when shadows are rendered from the haze layer.
          shadow-camera-layers-mask={VOLUMETRIC_LIGHT_MASK}
          distance={20}
          position={[0, 0.052, 0]}
          target={spotlightTarget}
          intensity={intensity}
          angle={THREE.MathUtils.degToRad(beamAngle / 2)}
          penumbra={0.5}
          castShadow
          color={colour}
        />
        <primitive object={spotlightTarget} position={[0, 1, 0]} />
      </mesh>
      {!viewOnly && isSelected && mesh && (
        <Visualiser3DTransformControls
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
