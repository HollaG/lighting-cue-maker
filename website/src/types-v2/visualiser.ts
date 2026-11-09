import type { Timestamps } from "./common";

/**
 * The 3D scene of an event. One per event.
 * Keep in sync with Visualiser in server/internal/models/v2/visualiser.go (JSON keys are `config3d` / `objects3d`).
 */
export type Visualiser = Timestamps & {
  id: string;
  eventId: string;

  /** [3D] The configuration for the 3D view */
  config3d: Visualiser3DEnvironment;

  /** [3D] The default camera view. `null` until the LD saves one. */
  defaultCameraView: Visualiser3DCameraView | null;

  /** [3D] The list of helper (non fixture) objects */
  objects3d: Visualiser3DObject[];
};

/**
 * The editable part of a visualiser. A field left out keeps its current value
 * (on create: its default). There is no id: the event comes from the URL.
 */
export type UpsertVisualiser = Partial<Pick<Visualiser, "config3d" | "objects3d" | "defaultCameraView">>;

export type Visualiser3DEnvironment = {
  haze: number; // 0-1
  ambientLight: number; // 0-1
};

export type Visualiser3DCameraView = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

export type ThreeObjectBase = {
  id: string;
  name: string;
};

export interface Visualiser3DCuboidType extends ThreeObjectBase {
  type: "cuboid";
  props: {
    position: [number, number, number];
    rotation: [number, number, number];
    size: [number, number, number];
    color: string;
  };
}

export interface Visualiser3DDefaultHumanType extends ThreeObjectBase {
  type: "default_human";
  props: {
    position: [number, number, number];
    rotation: [number, number, number];
    // size: [number, number, number];
  };
}

export type Visualiser3DObject = Visualiser3DCuboidType | Visualiser3DDefaultHumanType;
export type Visualiser3DObjectTypes = "cuboid" | "default_human";
