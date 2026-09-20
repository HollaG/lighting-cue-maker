import { useRef, useState } from "react";
import type { Visualiser3DCuboidType } from "../../../types/visualiser3d";

import * as THREE from "three";
import { useHotkey } from "@tanstack/react-hotkeys";
import { TransformControls } from "@react-three/drei";

export const Visualiser3DCuboid = ({
  cuboid,
  isSelected,
  onSelect,
  onChange,
}: {
  cuboid: Visualiser3DCuboidType;
  isSelected: boolean;
  onSelect: (cuboidId: string) => void;
  onChange: (newProps: Visualiser3DCuboidType["props"]) => void;
}) => {
  const meshRef = useRef<THREE.Mesh | null>(null);

  const [mode, setMode] = useState<"translate" | "rotate" | "scale">("translate");

  // useHotkey("T", () => setMode("translate"));
  // useHotkey("R", () => setMode("rotate"));

  useHotkey("W", () => setMode("translate"));
  useHotkey("E", () => setMode("rotate"));
  useHotkey("R", () => setMode("scale"));

  return (
    <TransformControls mode={mode}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        position={new THREE.Vector3(...cuboid.props.position)}
        rotation={new THREE.Euler(...cuboid.props.rotation)}
        scale={new THREE.Vector3(...cuboid.props.size)}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8AC" />
      </mesh>
    </TransformControls>
  );
};
