import { useRef } from "react";
import type { Visualiser3DCuboidType } from "../../../types/visualiser3d";

import * as THREE from "three";
import { TransformControls } from "@react-three/drei";
import { useAppStore } from "../../../store/appStore";

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

  const mode = useAppStore((state) => state.transformMode);

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
