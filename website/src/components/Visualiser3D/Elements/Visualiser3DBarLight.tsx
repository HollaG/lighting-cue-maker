import { useRef, useState } from "react";
import type { Fixture } from "../../../types/fixtures";
import type { PresetColourOption, PresetIntensityOption } from "../../../types/types";

import * as THREE from "three";
import { TransformControls } from "@react-three/drei";
import { getFixture3DPosition, getFixture3DRotation } from "../../../utils/visualiser";
import { useHotkey } from "@tanstack/react-hotkeys";

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
  onChange: (newProps: unknown) => void;

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
        onClick={() => {
          onSelect(fixture.id);
        }}
      >
        {/* Bar light, 1m x 0.07 x 0.07 */}
        <boxGeometry args={[1, 0.07, 0.07]} />
        <meshPhongMaterial color="#eeeeee" />
      </mesh>
      {!viewOnly && isSelected && meshRef.current && (
        <TransformControls object={meshRef.current} mode={mode} space={mode === "translate" ? "world" : "local"} />
      )}
    </>
  );
};
