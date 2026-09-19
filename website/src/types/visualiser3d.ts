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
