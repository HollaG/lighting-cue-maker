import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Box3,
  BoxGeometry,
  Layers,
  Mesh,
  RenderPipeline,
  Vector3,
  VolumeNodeMaterial,
  type WebGPURenderer,
} from "three/webgpu";
import { float, pass, screenCoordinate, screenUV, uniform } from "three/tsl";
import { bayer16 } from "three/addons/tsl/math/Bayer.js";
import { gaussianBlur } from "three/addons/tsl/display/GaussianBlurNode.js";
import { /* getFixture3DPosition, */ PLANE_SIZE } from "../../utils/visualiser";
import { VOLUMETRIC_LIGHTING_LAYER } from "./visualiser3DRenderer";
import type { Visualiser3DEnvironment } from "../../types-v2/visualiser";
import type { PatchedFixture } from "../../types-v2/patchedFixture";
import { useFrameGate } from "./frameGate";

const RESOLUTION_SCALE = 0.25;
const RAY_MARCHING_STEPS = 12;
const DENOISE_STRENGTH = 0.6;

/**
 * Renders shared, shadow-aware haze separately from the solid scene, and draws every frame of the canvas.
 * Scene depth stops scattering behind visible surfaces; only the haze pass is blurred.
 *
 * The pipelines are built once per renderer, scene and camera: haze strength is a uniform, so the slider doesn't
 * rebuild anything. At zero haze a solid-only pipeline draws instead, skipping the ray-march and blur.
 * Resources live in an effect so Strict Mode remounts also dispose them correctly.
 */
export const Visualiser3DVolumetrics = ({
  fixtures,
  environment,
}: {
  fixtures: PatchedFixture[];
  environment: Visualiser3DEnvironment;
}) => {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const pipelinesRef = useRef<{ haze: RenderPipeline; solid: RenderPipeline } | null>(null);
  const volumeRef = useRef<Mesh<BoxGeometry, VolumeNodeMaterial> | null>(null);
  const hazeStrength = useMemo(() => uniform(0), []);
  const gate = useFrameGate();

  useEffect(() => {
    // R3F still types state.gl as WebGLRenderer, even with an async WebGPU factory.
    const renderer = gl as unknown as WebGPURenderer;
    const material = new VolumeNodeMaterial();
    material.steps = RAY_MARCHING_STEPS;
    material.offsetNode = bayer16(screenCoordinate);
    // Smoke amount zero in the reference means uniform scattering, without noise.
    material.scatteringNode = () => float(1);

    const geometry = new BoxGeometry(1, 1, 1);
    const volume = new Mesh(geometry, material);
    volume.name = "Stage haze";
    volume.receiveShadow = true;
    volume.layers.set(VOLUMETRIC_LIGHTING_LAYER);
    volume.raycast = () => {};
    scene.add(volume);
    volumeRef.current = volume;

    const scenePass = pass(scene, camera);
    material.depthNode = scenePass.getTextureNode("depth").sample(screenUV);

    const volumeLayers = new Layers();
    volumeLayers.set(VOLUMETRIC_LIGHTING_LAYER);
    // No MSAA: the haze is low resolution and blurred, so multisampling it is wasted work.
    const volumePass = pass(scene, camera, { depthBuffer: false, samples: 0 });
    volumePass.setLayers(volumeLayers);
    volumePass.setResolutionScale(RESOLUTION_SCALE);

    const denoisedVolume = gaussianBlur(volumePass, float(DENOISE_STRENGTH));
    const haze = new RenderPipeline(renderer);
    haze.outputNode = scenePass.add(denoisedVolume.mul(hazeStrength));
    const solid = new RenderPipeline(renderer);
    solid.outputNode = scenePass;
    pipelinesRef.current = { haze, solid };
    invalidate();

    // PassNode and GaussianBlurNode follow the renderer's drawing-buffer size.
    return () => {
      pipelinesRef.current = null;
      volumeRef.current = null;
      scene.remove(volume);
      haze.dispose();
      solid.dispose();
      denoisedVolume.dispose();
      volumePass.dispose();
      scenePass.dispose();
      material.dispose();
      geometry.dispose();
    };
  }, [gl, scene, camera, invalidate, hazeStrength]);

  useEffect(() => {
    hazeStrength.value = environment.haze;
    invalidate();
  }, [hazeStrength, environment.haze, invalidate]);

  useEffect(() => {
    const volume = volumeRef.current;
    if (!volume) return;

    // Cover the stage and leave room around fixtures above or outside its edges.
    const halfStage = PLANE_SIZE / 2;
    const bounds = new Box3(new Vector3(-halfStage, 0, -halfStage), new Vector3(halfStage, 10, halfStage));
    // TODO: uncomment
    // this expands the haze to cover all fixtures
    // for (const fixture of fixtures) {
    //   const position = new Vector3(...getFixture3DPosition(fixture));
    //   bounds.expandByPoint(position.clone().addScalar(-2));
    //   bounds.expandByPoint(position.addScalar(2));
    // }
    bounds.getCenter(volume.position);
    bounds.getSize(volume.scale);
    invalidate();
  }, [fixtures, gl, scene, camera, invalidate]);

  // Positive priority replaces R3F's default draw, including in demand mode.
  useFrame(() => {
    const pipelines = pipelinesRef.current;
    if (!pipelines) return;
    if (!gate.draw) return; // over the frame cap; the gate already asked for another frame
    (hazeStrength.value > 0 ? pipelines.haze : pipelines.solid).render();
  }, 1);

  return null;
};
