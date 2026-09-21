import type { CanvasProps, RootState } from "@react-three/fiber";
import { NeutralToneMapping, RectAreaLightNode, WebGPURenderer, type WebGPURendererParameters } from "three/webgpu";
import { RectAreaLightTexturesLib } from "three/addons/lights/RectAreaLightTexturesLib.js";

export const VOLUMETRIC_LIGHTING_LAYER = 10;
export const VOLUMETRIC_LIGHT_MASK = 1 | (1 << VOLUMETRIC_LIGHTING_LAYER);

// The node renderer uses a different area-light lookup from WebGLRenderer.
RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init());

export const createVisualiser3DRenderer: CanvasProps["gl"] = async (props) => {
  const renderer = new WebGPURenderer(props as WebGPURendererParameters);
  await renderer.init();
  return renderer;
};

export const configureVisualiser3DRenderer = ({ gl }: RootState) => {
  // Apply after R3F sets its defaults, matching the volume-lighting reference.
  gl.toneMapping = NeutralToneMapping;
  gl.toneMappingExposure = 2;
};
