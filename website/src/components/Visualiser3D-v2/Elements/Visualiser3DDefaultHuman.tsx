import { Visualiser3DTransformControls } from "./Visualiser3DTransformControls";
import { useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import HumanModelUrl from "../../../assets/models/human.gltf?url";
import HumanBufferUrl from "../../../assets/models/scene.bin?url";
import { useAppStore } from "../../../store/appStore";
import type { Visualiser3DDefaultHumanType } from "../../../types/visualiser3d";
import type { GUI } from "lil-gui";
import { useVisualiser3DGuiControls } from "./useVisualiser3DGuiControls";

const MODEL_SCALE = 0.00314;

export const Visualiser3DDefaultHuman = ({
  human,
  isSelected,
  onSelect,
  onChange,
  gui,
}: {
  human: Visualiser3DDefaultHumanType;
  isSelected: boolean;
  onSelect: (humanId: string) => void;
  onChange: (newElement: Visualiser3DDefaultHumanType) => void;
  gui: GUI | null;
}) => {
  const [group, setGroup] = useState<THREE.Group | null>(null);
  const _mode = useAppStore((state) => state.transformMode);
  const gltf = useLoader(GLTFLoader, HumanModelUrl, (loader) => {
    // Vite does not bundle files referenced inside GLTF; map the buffer to its imported URL.
    loader.manager = new THREE.LoadingManager().setURLModifier((url) =>
      url.endsWith("/scene.bin") || url === "scene.bin" ? HumanBufferUrl : url,
    );
  });

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

  const saveChanges = () => {
    if (!group) return;
    onChange({
      ...human,
      props: {
        position: [group.position.x, group.position.y, group.position.z],
        rotation: [group.rotation.x, group.rotation.y, group.rotation.z],
      },
    });
  };

  useVisualiser3DGuiControls({
    gui,
    object: group,
    isSelected,
    title: human.name || "Human",
    onFinishChange: saveChanges,
  });

  return (
    <>
      {isSelected && group && (
        <Visualiser3DTransformControls
          object={group}
          mode={mode}
          space={mode === "translate" ? "world" : "local"}
          onMouseUp={() => {
            saveChanges();
          }}
        />
      )}

      <group
        ref={setGroup}
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
