import { useState } from "react";
import type { Visualiser3DCuboidType } from "../../../types/visualiser3d";

import * as THREE from "three";
import { TransformControls } from "@react-three/drei";
import { useAppStore } from "../../../store/appStore";
import type { GUI } from "lil-gui";
import { useVisualiser3DGuiControls } from "./useVisualiser3DGuiControls";

export const Visualiser3DCuboid = ({
  cuboid,
  isSelected,
  onSelect,
  onChange,
  gui,
}: {
  cuboid: Visualiser3DCuboidType;
  isSelected: boolean;
  onSelect: (cuboidId: string) => void;
  onChange: (newElement: Visualiser3DCuboidType) => void;
  gui: GUI | null;
}) => {
  const [mesh, setMesh] = useState<THREE.Mesh | null>(null);

  const mode = useAppStore((state) => state.transformMode);

  const saveChanges = () => {
    if (!mesh) return;
    onChange({
      ...cuboid,
      props: {
        ...cuboid.props,
        position: [mesh.position.x, mesh.position.y, mesh.position.z],
        rotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
        size: [mesh.scale.x, mesh.scale.y, mesh.scale.z],
      },
    });
  };

  useVisualiser3DGuiControls({
    gui,
    object: mesh,
    isSelected,
    title: cuboid.name || "Cuboid",
    includeProperties: ["position", "rotation", "scale"],
    onFinishChange: saveChanges,
  });

  return (
    <>
      {isSelected && mesh && (
        <TransformControls
          object={mesh}
          mode={mode}
          space={mode === "translate" ? "world" : "local"}
          onMouseUp={() => {
            saveChanges();
          }}
        />
      )}

      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect(cuboid.id);
        }}

        ref={setMesh}
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
