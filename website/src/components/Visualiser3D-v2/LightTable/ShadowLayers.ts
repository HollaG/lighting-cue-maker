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
export const SHADOW_LAYERS = 128;
/** Width and height of each layer. 128 layers at 512² is about 134 MB of depth. */
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

export class ShadowLayers {
  readonly layerCount = SHADOW_LAYERS;
  readonly depthTexture: DepthTexture;
  /** Each layer's shadow matrix (world → shadow map), one column of 4 texels per layer. */
  readonly matrixTexture: DataTexture;
  /** Total layer redraws, for measuring. */
  redraws = 0;

  private readonly renderTarget: RenderTarget;
  private readonly matrixData = new Float32Array(SHADOW_LAYERS * 4 * 4);
  private readonly layers: Layer[] = [];
  private readonly material: NodeMaterial;
  private castersKey = NaN;
  /** Where the round-robin over dirty layers continues, so a budget doesn't starve high layers. */
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
      SHADOW_LAYERS,
    );
    this.depthTexture.name = "LightTableShadowDepth";
    // Hardware comparison with linear filtering: one tap gives a 2×2 soft edge.
    this.depthTexture.compareFunction = LessEqualCompare;
    this.depthTexture.minFilter = LinearFilter;
    this.depthTexture.magFilter = LinearFilter;

    this.renderTarget = new RenderTarget(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE, {
      format: RedFormat,
      depth: SHADOW_LAYERS,
      useArrayDepthTexture: true,
    });
    this.renderTarget.depthTexture = this.depthTexture;
    this.renderTarget.texture.name = "LightTableShadowColour";

    this.matrixTexture = new DataTexture(this.matrixData, SHADOW_LAYERS, 4, RGBAFormat, FloatType);
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

    for (let i = 0; i < SHADOW_LAYERS; i++) {
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
      this.layers.push({ light, shadow, dirty: true, active: false });
    }
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
    let budget = MAX_SHADOW_REDRAWS_PER_FRAME;
    let waiting = 0;
    let stateSaved = false;
    const previousObjectFunction = renderer.getRenderObjectFunction();
    const sceneName = scene.name;

    for (let step = 0; step < SHADOW_LAYERS; step++) {
      const index = (this.cursor + step) % SHADOW_LAYERS;
      const layer = this.layers[index];
      if (!layer.dirty || !layer.active) continue;
      if (budget === 0) {
        if (waiting === 0) this.cursor = index; // continue from the first one left out
        waiting++;
        continue;
      }
      budget--;

      if (!stateSaved) {
        stateSaved = true;
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
      }

      const { shadow, light } = layer;
      shadow.updateMatrices(light as unknown as THREE.Light);
      const elements = shadow.matrix.elements;
      // Texel (layer, row) holds matrix column `row`.
      for (let row = 0; row < 4; row++) {
        for (let i = 0; i < 4; i++) this.matrixData[(row * SHADOW_LAYERS + index) * 4 + i] = elements[row * 4 + i];
      }

      // The bench counts renders of scenes named "Shadow Map…" as shadow redraws, like three's own shadow pass.
      scene.name = `Shadow Map [ light table layer ${index} ]`;
      renderer.setRenderTarget(this.renderTarget, index);
      renderer.render(scene, shadow.camera);
      layer.dirty = false;
      this.redraws++;
    }

    if (stateSaved) {
      scene.name = sceneName;
      renderer.setRenderObjectFunction(previousObjectFunction as never);
      restoreRendererAndSceneState(renderer, scene, rendererState);
      this.matrixTexture.needsUpdate = true;
    }
    if (waiting === 0) this.cursor = 0;
    return waiting;
  }

  dispose() {
    this.renderTarget.dispose();
    this.depthTexture.dispose();
    this.matrixTexture.dispose();
    this.material.dispose();
  }
}
