import { useState } from "react";
import type { Fixture, UpdateFixtureIn3DReq } from "../../../types/fixtures";
import type { PresetColourOption, PresetIntensityOption } from "../../../types/types";

import * as THREE from "three";
import { Helper, TransformControls } from "@react-three/drei";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { RectAreaLightHelper } from "three/addons/helpers/RectAreaLightHelper.js";
import {
  convert3DPropsToFixtureRepresentation,
  getFixture3DPosition,
  getFixture3DRotation,
} from "../../../utils/visualiser";
import { useAppStore } from "../../../store/appStore";

RectAreaLightUniformsLib.init();

export const Visualiser3DBarLight = ({
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
        {/* Bar light, 1m x 0.07 x 0.07 */}
        <boxGeometry args={[1, 0.07, 0.07]} />
        <meshStandardMaterial color="#eeeeee" />

        {/* RectAreaLight emits along local -Z, so rotate it to face local +Y. */}
        {(isSelected || viewOnly) && (
          <rectAreaLight
            position={[0, 0.07 / 2 + 0.0001, 0]}
            rotation={[Math.PI / 2, 0, Math.PI / 2]}
            width={0.07}
            height={1}
            intensity={(intensityAttribute ?? 100) * 0.2}
            color={colourAttribute?.hex ?? "#ffffff"}
          >
            <Helper type={RectAreaLightHelper} />
          </rectAreaLight>
        )}
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
