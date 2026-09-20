export type Visualiser3D = {
  id: string;

  // defaultViewport // TODO
  // objects3D: Visualiser3DObjects[];

  // Environment controls
  environment: Visualiser3DEnvironment;
};

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
  };
}

export type Visualiser3DObject = Visualiser3DCuboidType | Visualiser3DDefaultHumanType;
export type Visualiser3DObjectTypes = "cuboid" | "default_human";
