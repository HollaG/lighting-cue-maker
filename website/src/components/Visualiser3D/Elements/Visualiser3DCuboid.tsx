import { useState } from "react";
import type { Visualiser3DCuboidType } from "../../../types/visualiser3d";

import * as THREE from "three";
import { Visualiser3DTransformControls } from "./Visualiser3DTransformControls";
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
  const [mesh, setMesh] = useState<THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null>(null);

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

    addCustomControls: (folder) => {
      // Add a custom control for the color property
      const colorControl = { color: cuboid.props.color || "#8AC" };
      folder
        .addColor(colorControl, "color")
        .name("Color")
        .onChange((value: string) => {
          if (!mesh) return;
          mesh.material.color.set(value);
          onChange({
            ...cuboid,
            props: {
              ...cuboid.props,
              color: value,
            },
          });
        });
    },
  });

  return (
    <>
      {isSelected && mesh && (
        <Visualiser3DTransformControls
          object={mesh}
          mode={mode}
          space={mode === "translate" ? "world" : "local"}
          onMouseUp={() => {
            saveChanges();
          }}
        />
      )}

      <mesh
        // onClick={(event) => {
        //   console.log("onclick fired for Cuboid", cuboid.id);
        //   event.stopPropagation();
        //   onSelect(cuboid.id);
        // }}

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
        <meshStandardMaterial color={cuboid.props.color || "#8AC"} />
      </mesh>
    </>
  );
};
