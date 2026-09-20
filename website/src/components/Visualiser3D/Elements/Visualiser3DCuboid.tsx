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
  onChange: (newElement: Visualiser3DCuboidType) => void;
}) => {
  const meshRef = useRef<THREE.Mesh | null>(null);

  const mode = useAppStore((state) => state.transformMode);

  return (
    <>
      {isSelected && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode={mode}
          space={mode === "translate" ? "world" : "local"}
          onMouseUp={() => {
            const mesh = meshRef.current;
            if (!mesh) return;

            // onChange(convert3DPropsToFixtureRepresentation(mesh.position, mesh.rotation, fixture));
            const newElement = { ...cuboid };
            newElement.props.position = [mesh.position.x, mesh.position.y, mesh.position.z];
            newElement.props.rotation = [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z];
            newElement.props.size = [mesh.scale.x, mesh.scale.y, mesh.scale.z];

            onChange(newElement);
          }}
        />
      )}

      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect(cuboid.id);
        }}

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
    </>
  );
};
