import type { CanvasProps, RootState } from "@react-three/fiber";
import { NeutralToneMapping, RectAreaLightNode, WebGPURenderer, type WebGPURendererParameters } from "three/webgpu";
import { RectAreaLightTexturesLib } from "three/addons/lights/RectAreaLightTexturesLib.js";

export const VOLUMETRIC_LIGHTING_LAYER = 10;
export const VOLUMETRIC_LIGHT_MASK = 1 | (1 << VOLUMETRIC_LIGHTING_LAYER);

// The node renderer uses a different area-light lookup from WebGLRenderer.
RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init());

// TODO: Remove this workaround once the installed R3F version fixes https://github.com/pmndrs/react-three-fiber/issues/3782.
const rendererInitializations = new WeakMap<EventTarget, Promise<WebGPURenderer>>();

/** Reuse initialization when R3F configures the same canvas again before init finishes. */
export const createVisualiser3DRenderer: CanvasProps["gl"] = (props) => {
  const existing = rendererInitializations.get(props.canvas);
  if (existing) return existing;

  const renderer = new WebGPURenderer(props as WebGPURendererParameters);
  const initialization = renderer.init().then(
    () => renderer,
    (error: unknown) => {
      rendererInitializations.delete(props.canvas);
      throw error;
    },
  );
  // Cache the promise immediately so concurrent calls cannot create a second renderer.
  rendererInitializations.set(props.canvas, initialization);
  return initialization;
};

export const configureVisualiser3DRenderer = ({ gl }: RootState) => {
  // Apply after R3F sets its defaults, matching the volume-lighting reference.
  gl.toneMapping = NeutralToneMapping;
  gl.toneMappingExposure = 2;
};
