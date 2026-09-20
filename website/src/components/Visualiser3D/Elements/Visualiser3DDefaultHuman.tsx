import { TransformControls } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import HumanModelUrl from "../../../assets/models/human.gltf?url";
import { useAppStore } from "../../../store/appStore";
import type { Visualiser3DDefaultHumanType } from "../../../types/visualiser3d";

const MODEL_SCALE = 0.00314;

export const Visualiser3DDefaultHuman = ({
  human,
  isSelected,
  onSelect,
  onChange,
}: {
  human: Visualiser3DDefaultHumanType;
  isSelected: boolean;
  onSelect: (humanId: string) => void;
  onChange: (newElement: Visualiser3DDefaultHumanType) => void;
}) => {
  const groupRef = useRef<THREE.Group | null>(null);
  const _mode = useAppStore((state) => state.transformMode);
  const gltf = useLoader(GLTFLoader, HumanModelUrl);

  // useLoader caches the GLTF, so each stage element needs its own scene instance.
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, [scene]);

  // note: scaling not allowed.
  const mode = _mode === "scale" ? "translate" : _mode;

  return (
    <>
      {isSelected && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode={mode}
          space={mode === "translate" ? "world" : "local"}
          onMouseUp={() => {
            const group = groupRef.current;
            if (!group) return;

            onChange({
              ...human,
              props: {
                position: [group.position.x, group.position.y, group.position.z],
                rotation: [group.rotation.x, group.rotation.y, group.rotation.z],
                // size: [group.scale.x, group.scale.y, group.scale.z],
              },
            });
          }}
        />
      )}

      <group
        ref={groupRef}
        position={human.props.position}
        rotation={human.props.rotation}
        // scale={human.props.size}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(human.id);
        }}
      >
        <primitive object={scene} scale={MODEL_SCALE} />
      </group>
    </>
  );
};
