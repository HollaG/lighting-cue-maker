/**
 * Shared shadow storage for the light table (optimization plan, step 5): one depth texture array, one layer per
 * shadow-casting light. The array is a single texture binding, so WebGPU's 16-textures-per-shader limit (which capped
 * the old renderer at 8 shadows) does not apply.
 *
 * A layer is redrawn only when it is dirty: its light moved or changed cone, or a shadow-casting object changed.
 * Camera movement and colour changes redraw nothing.
 */
import * as THREE from "three";
import {
  DataTexture,
  DepthTexture,
  FloatType,
  LessEqualCompare,
  LinearFilter,
  NearestFilter,
  NoBlending,
  RGBAFormat,
  RedFormat,
  SpotLight,
  type SpotLightShadow,
} from "three";
import { NodeMaterial, RenderTarget, RendererUtils, type WebGPURenderer } from "three/webgpu";
import { vec4 } from "three/tsl";

/** Most lights that can cast a shadow. WebGPU guarantees 256 array layers. */
export const MAX_SHADOW_LAYERS = 256;
/** The array starts with this many layers and doubles when more lights need one. */
const INITIAL_SHADOW_LAYERS = 8;
/** Width and height of each layer. A layer is about 1.3 MB (depth plus an unused colour byte three requires). */
export const SHADOW_MAP_SIZE = 512;
/** Most layers redrawn in one frame; the rest wait for the next frame (their shadows are one frame late). */
export const MAX_SHADOW_REDRAWS_PER_FRAME = 32;
/** Shadow cameras start this far from the lens. */
const SHADOW_NEAR = 0.1;

/** What three's SpotLightShadow.updateMatrices reads from a light. */
type ShadowLight = THREE.Object3D & { target: THREE.Object3D; angle: number; distance: number };

type Layer = {
  light: ShadowLight;
  shadow: SpotLightShadow;
  /** Needs a redraw before its shadow is right. */
  dirty: boolean;
  /** Its light is lit this frame. Only these are redrawn. */
  active: boolean;
};

// three's typings for these two leave out the `scene` argument the functions take.
const resetRendererAndSceneState = RendererUtils.resetRendererAndSceneState as unknown as (
  renderer: WebGPURenderer,
  scene: THREE.Scene,
  state: unknown,
) => unknown;
const restoreRendererAndSceneState = RendererUtils.restoreRendererAndSceneState as unknown as (
  renderer: WebGPURenderer,
  scene: THREE.Scene,
  state: unknown,
) => void;

let rendererState: unknown;

const createLayer = (): Layer => {
  const light = new THREE.Object3D() as ShadowLight;
  light.target = new THREE.Object3D();
  light.angle = 0;
  light.distance = 0;
  // three doesn't export SpotLightShadow at runtime; a SpotLight comes with one.
  const shadow = new SpotLight().shadow;
  shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  shadow.camera.near = SHADOW_NEAR;
  // WebGPU clip space (z from 0 to 1); three's ShadowNode sets this from the scene camera.
  shadow.camera.coordinateSystem = THREE.WebGPUCoordinateSystem;
  shadow.camera.updateProjectionMatrix();
  return { light, shadow, dirty: true, active: false };
};

export class ShadowLayers {
  /** Layers allocated so far. Grows with `grow`. */
  get layerCount() {
    return this.layers.length;
  }
  readonly depthTexture: DepthTexture;
  /** Each layer's shadow matrix (world → shadow map), one column of 4 texels per layer. */
  readonly matrixTexture: DataTexture;
  /** Total layer redraws, for measuring. */
  redraws = 0;

  private readonly renderTarget: RenderTarget;
  private readonly matrixData = new Float32Array(MAX_SHADOW_LAYERS * 4 * 4);
  private readonly layers: Layer[] = [];
  private readonly material: NodeMaterial;
  private castersKey = NaN;
  /** The GPU textures don't exist yet at the current size; see `prepare`. */
  private needsInit = true;
  /** Where the search for dirty layers starts next frame. */
  private cursor = 0;

  constructor() {
    this.depthTexture = new DepthTexture(
      SHADOW_MAP_SIZE,
      SHADOW_MAP_SIZE,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      INITIAL_SHADOW_LAYERS,
    );
    this.depthTexture.name = "LightTableShadowDepth";
    // Hardware comparison with linear filtering: one tap gives a 2×2 soft edge.
    this.depthTexture.compareFunction = LessEqualCompare;
    this.depthTexture.minFilter = LinearFilter;
    this.depthTexture.magFilter = LinearFilter;

    this.renderTarget = new RenderTarget(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE, {
      format: RedFormat,
      depth: INITIAL_SHADOW_LAYERS,
      useArrayDepthTexture: true,
    });
    this.renderTarget.depthTexture = this.depthTexture;
    this.renderTarget.texture.name = "LightTableShadowColour";

    this.matrixTexture = new DataTexture(this.matrixData, MAX_SHADOW_LAYERS, 4, RGBAFormat, FloatType);
    this.matrixTexture.minFilter = NearestFilter;
    this.matrixTexture.magFilter = NearestFilter;
    this.matrixTexture.generateMipmaps = false;
    this.matrixTexture.needsUpdate = true;

    // Same as three's own shadow pass material: the renderer picks the side per object (see `isShadowPassMaterial`).
    this.material = new NodeMaterial();
    this.material.colorNode = vec4(0, 0, 0, 1);
    (this.material as NodeMaterial & { isShadowPassMaterial: boolean }).isShadowPassMaterial = true;
    this.material.name = "LightTableShadowMaterial";
    this.material.blending = NoBlending;
    this.material.fog = false;

    for (let i = 0; i < INITIAL_SHADOW_LAYERS; i++) this.layers.push(createLayer());
  }

  /**
   * Doubles the number of layers (up to MAX_SHADOW_LAYERS), so memory follows the number of shadow-casting lights.
   * The GPU textures are recreated empty, so every layer is redrawn.
   * @returns false when already at the maximum
   */
  grow() {
    if (this.layers.length >= MAX_SHADOW_LAYERS) return false;
    const count = Math.min(this.layers.length * 2, MAX_SHADOW_LAYERS);
    while (this.layers.length < count) this.layers.push(createLayer());
    this.renderTarget.setSize(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE, count);
    // three only resizes a depth texture it created itself, so resize ours here.
    this.depthTexture.image.depth = count;
    this.depthTexture.needsUpdate = true;
    this.needsInit = true;
    this.invalidateAll();
    return true;
  }

  /**
   * Creates the GPU textures if they don't exist at the current size. Call every frame before anything is drawn.
   *
   * Materials bind the depth array the first time they draw, even with every light off. If the render target is only
   * initialised later, at the first shadow redraw, three destroys and recreates the texture and the materials keep the
   * destroyed one: every solid draw then fails ("Destroyed texture used in a submit") and the scene freezes.
   */
  prepare(renderer: WebGPURenderer) {
    if (!this.needsInit) return;
    this.needsInit = false;
    renderer.initRenderTarget(this.renderTarget);
  }

  /** Start of a frame: no layer is in use until its light says so through `setPose`. */
  beginFrame() {
    for (const layer of this.layers) layer.active = false;
  }

  /** The lit light that owns `layerIndex` is here this frame. Marks the layer dirty if that differs from last time. */
  setPose(layerIndex: number, position: THREE.Vector3, direction: THREE.Vector3, angle: number, distance: number) {
    const layer = this.layers[layerIndex];
    const { light } = layer;
    layer.active = true;
    const target = light.target.position;
    if (
      light.angle === angle &&
      light.distance === distance &&
      light.position.equals(position) &&
      target.x === position.x + direction.x &&
      target.y === position.y + direction.y &&
      target.z === position.z + direction.z
    ) {
      return;
    }
    light.angle = angle;
    light.distance = distance;
    light.position.copy(position);
    target.copy(position).add(direction);
    light.updateMatrixWorld();
    light.target.updateMatrixWorld();
    layer.dirty = true;
  }

  invalidate(layerIndex: number) {
    this.layers[layerIndex].dirty = true;
  }

  invalidateAll() {
    for (const layer of this.layers) layer.dirty = true;
  }

  /**
   * Marks every layer dirty if any shadow-casting object moved, appeared, disappeared or changed shape since the last
   * call. World matrices must be up to date. A conservative "redraw all": fine while objects only move at edit time.
   */
  checkCasters(scene: THREE.Object3D) {
    let key = 0;
    scene.traverseVisible((object) => {
      if (!object.castShadow) return;
      const elements = object.matrixWorld.elements;
      for (let i = 0; i < 16; i++) key = (Math.imul(key, 31) + Math.fround(elements[i]) * 4096) | 0;
      const geometry = (object as THREE.Mesh).geometry;
      if (geometry) key = (Math.imul(key, 31) + geometry.id) | 0;
    });
    if (key !== this.castersKey) {
      this.castersKey = key;
      this.invalidateAll();
    }
  }

  /**
   * Redraws the dirty layers whose lights are lit, up to the per-frame budget.
   * @returns how many are still waiting; ask for another frame if this is not 0.
   */
  render(renderer: WebGPURenderer, scene: THREE.Scene) {
    // 1. Pick this frame's layers and write their matrices.
    const picked: number[] = [];
    let waiting = 0;
    const layerCount = this.layers.length;
    for (let step = 0; step < layerCount; step++) {
      const index = (this.cursor + step) % layerCount;
      const layer = this.layers[index];
      if (!layer.dirty || !layer.active) continue;
      if (picked.length === MAX_SHADOW_REDRAWS_PER_FRAME) {
        waiting++;
        continue;
      }
      picked.push(index);

      layer.shadow.updateMatrices(layer.light as unknown as THREE.Light);
      const elements = layer.shadow.matrix.elements;
      // Texel (layer, row) holds matrix column `row`.
      for (let row = 0; row < 4; row++) {
        for (let i = 0; i < 4; i++) this.matrixData[(row * MAX_SHADOW_LAYERS + index) * 4 + i] = elements[row * 4 + i];
      }
    }
    if (picked.length === 0) return waiting;
    // Upload now. Left to three (needsUpdate alone), this frame's draw still used the old matrices: the last layers
    // of a load stayed dark until something else caused another frame. The cause inside three was not found.
    this.matrixTexture.needsUpdate = true;
    renderer.initTexture(this.matrixTexture);
    // Next frame continues after the last one drawn, so a budget doesn't starve the high layers.
    this.cursor = waiting > 0 ? (picked[picked.length - 1] + 1) % layerCount : 0;

    // 2. Draw them, with three's shadow-pass setup.
    const previousObjectFunction = renderer.getRenderObjectFunction();
    const sceneName = scene.name;
    rendererState = resetRendererAndSceneState(renderer, scene, rendererState);
    scene.overrideMaterial = this.material;
    renderer.setClearColor(0x000000, 0);
    // Only objects that cast shadows; three's shadow pass does the same.
    renderer.setRenderObjectFunction(
      (object, objectScene, camera, geometry, material, group, lightsNode, clippingContext, passId) => {
        if (object.castShadow) {
          renderer.renderObject(object, objectScene, camera, geometry, material, group, lightsNode, clippingContext, passId);
        }
      },
    );

    for (const index of picked) {
      const layer = this.layers[index];
      // The bench counts renders of scenes named "Shadow Map…" as shadow redraws, like three's own shadow pass.
      scene.name = `Shadow Map [ light table layer ${index} ]`;
      renderer.setRenderTarget(this.renderTarget, index);
      renderer.render(scene, layer.shadow.camera);
      layer.dirty = false;
      this.redraws++;
    }

    scene.name = sceneName;
    renderer.setRenderObjectFunction(previousObjectFunction as never);
    restoreRendererAndSceneState(renderer, scene, rendererState);
    return waiting;
  }

  dispose() {
    this.renderTarget.dispose();
    this.depthTexture.dispose();
    this.matrixTexture.dispose();
    this.material.dispose();
  }
}
