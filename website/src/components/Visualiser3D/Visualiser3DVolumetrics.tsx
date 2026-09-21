import { useEffect, useRef } from "react";
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
import { float, pass, screenCoordinate, screenUV } from "three/tsl";
import { bayer16 } from "three/addons/tsl/math/Bayer.js";
import { gaussianBlur } from "three/addons/tsl/display/GaussianBlurNode.js";
import type { Fixture } from "../../types/fixtures";
import { getFixture3DPosition, PLANE_SIZE } from "../../utils/visualiser";
import { VOLUMETRIC_LIGHTING_LAYER } from "./visualiser3DRenderer";
import type { Visualiser3DEnvironment } from "../../types/visualiser3d";

const RESOLUTION_SCALE = 0.25;
const RAY_MARCHING_STEPS = 12;
const DENOISE_STRENGTH = 0.6;

/**
 * Renders shared, shadow-aware haze separately from the solid scene. Scene depth
 * stops scattering behind visible surfaces; only the haze pass is blurred.
 * Resources live in an effect so Strict Mode remounts also dispose them correctly.
 */
export const Visualiser3DVolumetrics = ({
  fixtures,
  environment,
}: {
  fixtures: Fixture[];
  environment: Visualiser3DEnvironment;
}) => {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const pipelineRef = useRef<RenderPipeline | null>(null);
  const volumeRef = useRef<Mesh<BoxGeometry, VolumeNodeMaterial> | null>(null);

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
    const volumePass = pass(scene, camera, { depthBuffer: false });
    volumePass.setLayers(volumeLayers);
    volumePass.setResolutionScale(RESOLUTION_SCALE);

    const denoisedVolume = gaussianBlur(volumePass, float(DENOISE_STRENGTH));
    const pipeline = new RenderPipeline(renderer);
    pipeline.outputNode = scenePass.add(denoisedVolume.mul(environment.haze));
    pipelineRef.current = pipeline;
    invalidate();

    // PassNode and GaussianBlurNode follow the renderer's drawing-buffer size.
    return () => {
      pipelineRef.current = null;
      volumeRef.current = null;
      scene.remove(volume);
      pipeline.dispose();
      denoisedVolume.dispose();
      volumePass.dispose();
      scenePass.dispose();
      material.dispose();
      geometry.dispose();
    };
  }, [gl, scene, camera, invalidate, environment]);

  useEffect(() => {
    const volume = volumeRef.current;
    if (!volume) return;

    // Cover the stage and leave room around fixtures above or outside its edges.
    const halfStage = PLANE_SIZE / 2;
    const bounds = new Box3(new Vector3(-halfStage, 0, -halfStage), new Vector3(halfStage, 10, halfStage));
    for (const fixture of fixtures) {
      const position = new Vector3(...getFixture3DPosition(fixture));
      bounds.expandByPoint(position.clone().addScalar(-2));
      bounds.expandByPoint(position.addScalar(2));
    }
    bounds.getCenter(volume.position);
    bounds.getSize(volume.scale);
    invalidate();
  }, [fixtures, gl, scene, camera, invalidate, environment]);

  // Positive priority replaces R3F's default draw, including in demand mode.
  useFrame(() => pipelineRef.current?.render(), 1);

  return null;
};
