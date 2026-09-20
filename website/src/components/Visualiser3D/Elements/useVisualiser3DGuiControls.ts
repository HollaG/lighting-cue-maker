import { useEffect, useRef } from "react";
import type { GUI } from "lil-gui";
import type * as THREE from "three";
import { PLANE_SIZE } from "../../../utils/visualiser";

export type Properties = "position" | "rotation" | "scale";
const DEFAULT_PROPERTIES: Properties[] = ["position", "rotation"];

/** Adds controls for the selected object to the shared visualiser GUI. */
export const useVisualiser3DGuiControls = ({
  gui,
  object,
  isSelected,
  title,

  includeProperties = DEFAULT_PROPERTIES,
  addCustomControls,
  onFinishChange,
}: {
  gui: GUI | null;
  object: THREE.Object3D | null;
  isSelected: boolean;
  title: string;

  includeProperties?: Properties[];
  addCustomControls?: (folder: GUI) => void;

  onFinishChange: () => void;
}) => {
  const onFinishChangeRef = useRef(onFinishChange);
  onFinishChangeRef.current = onFinishChange;
  const addCustomControlsRef = useRef(addCustomControls);
  addCustomControlsRef.current = addCustomControls;

  useEffect(() => {
    if (!gui || !object || !isSelected) return;

    const objectFolder = gui.addFolder(title);

    for (const property of includeProperties) {
      const positionFolder = objectFolder.addFolder(property.charAt(0).toUpperCase() + property.slice(1));
      const x = positionFolder.add(object[property], "x", -PLANE_SIZE / 2, PLANE_SIZE / 2, 0.01).listen();
      const y = positionFolder.add(object[property], "y", -PLANE_SIZE / 2, PLANE_SIZE / 2, 0.01).listen();
      const z = positionFolder.add(object[property], "z", -PLANE_SIZE / 2, PLANE_SIZE / 2, 0.01).listen();

      if (property === "position") {
        x.name("x (Red) m");
        y.name("y (Green) m");
        z.name("z (Blue) m");
      }
    }

    addCustomControlsRef.current?.(objectFolder);

    objectFolder.onFinishChange(() => onFinishChangeRef.current());

    return () => objectFolder.destroy();
  }, [gui, object, isSelected, title, includeProperties]);
};
