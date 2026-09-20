import { useEffect, useRef } from "react";
import type { GUI } from "lil-gui";
import type * as THREE from "three";
import { PLANE_SIZE } from "../../../utils/visualiser";

/** Adds controls for the selected object to the shared visualiser GUI. */
export const useVisualiser3DGuiControls = ({
  gui,
  object,
  isSelected,
  title,
  includeScale = false,
  onFinishChange,
}: {
  gui: GUI | null;
  object: THREE.Object3D | null;
  isSelected: boolean;
  title: string;
  includeScale?: boolean;
  onFinishChange: () => void;
}) => {
  const onFinishChangeRef = useRef(onFinishChange);
  onFinishChangeRef.current = onFinishChange;

  useEffect(() => {
    if (!gui || !object || !isSelected) return;

    const objectFolder = gui.addFolder(title);
    const positionFolder = objectFolder.addFolder("Position");
    positionFolder.add(object.position, "x", -PLANE_SIZE / 2, PLANE_SIZE / 2, 0.01).listen();
    positionFolder.add(object.position, "y", -PLANE_SIZE / 2, PLANE_SIZE / 2, 0.01).listen();
    positionFolder.add(object.position, "z", -PLANE_SIZE / 2, PLANE_SIZE / 2, 0.01).listen();

    const rotationFolder = objectFolder.addFolder("Rotation");
    rotationFolder.add(object.rotation, "x", -Math.PI, Math.PI, 0.01).listen();
    rotationFolder.add(object.rotation, "y", -Math.PI, Math.PI, 0.01).listen();
    rotationFolder.add(object.rotation, "z", -Math.PI, Math.PI, 0.01).listen();

    if (includeScale) {
      const scaleFolder = objectFolder.addFolder("Scale");
      scaleFolder.add(object.scale, "x", 0.01, 10, 0.01).listen();
      scaleFolder.add(object.scale, "y", 0.01, 10, 0.01).listen();
      scaleFolder.add(object.scale, "z", 0.01, 10, 0.01).listen();
    }

    objectFolder.onFinishChange(() => onFinishChangeRef.current());

    return () => objectFolder.destroy();
  }, [gui, object, isSelected, title, includeScale]);
};
