/**
 * The light table (optimization plan, steps 4 and 5): every head light as rows of one data texture, lit by one loop
 * in the shader (LightTableNode.ts), instead of one three.js light per head.
 *
 * - Adding, removing or switching a light changes data, never shader code, so nothing recompiles.
 * - Lights that are off are left out when the table is packed, so the shader never visits them.
 * - Data is in world space, so it only changes when a light moves or changes colour, not when the camera moves.
 *
 * On by default; see `lightTable` in makeVisualiser3DRenderer.
 */
import * as THREE from "three";
import { DataTexture, FloatType, NearestFilter, RGBAFormat } from "three";
import { renderGroup, uniform } from "three/tsl";
import { ShadowLayers } from "./ShadowLayers";

/** Most lights the table can hold lit at once. One texel column each. */
export const LIGHT_CAPACITY = 2048;
/** Texel rows per light, see LightTable.update for what each holds. */
export const LIGHT_ROWS = 4;

/**
 * One head's light. Fixtures create these and the table reads them every drawn frame.
 * `color` and `intensity` have the same meaning as on a three.js light, so the effect player and the fixture write
 * to a TableLight exactly as they would to a SpotLight.
 */
export type TableLight = {
  color: THREE.Color;
  /** 0–100, like the head state. */
  intensity: number;
  /** Multiplies `intensity`. 1 for a spot; an LED head uses its lens area, to match the panel light it replaces. */
  intensityScale: number;
  /** The light sits at `localPosition` in this object's space and shines along its local +Y. */
  parent: THREE.Object3D | null;
  localPosition: THREE.Vector3;
  /** Half the beam angle, radians. */
  angle: number;
  /** 0–1, like SpotLight.penumbra. */
  penumbra: number;
  /** Reach in metres. */
  distance: number;
  castShadow: boolean;
  /** Set by the table: this light's layer in the shadow array, or -1. Stable for as long as the light is registered. */
  shadowLayer: number;
};

export const createTableLight = (options: Partial<TableLight> = {}): TableLight => ({
  color: new THREE.Color(1, 1, 1),
  intensity: 0,
  intensityScale: 1,
  parent: null,
  localPosition: new THREE.Vector3(),
  angle: Math.PI / 12,
  penumbra: 0.5,
  distance: 20,
  castShadow: false,
  shadowLayer: -1,
  ...options,
});

const position = new THREE.Vector3();
const direction = new THREE.Vector3();

export class LightTable {
  readonly data = new Float32Array(LIGHT_CAPACITY * LIGHT_ROWS * 4);
  readonly texture: DataTexture;
  /**
   * How many columns of the texture hold a lit light this frame.
   *
   * In the shared render group on purpose. In the default per-object group, three gives every object its own copy of
   * the value but one shared "last written" cache, so only the first object drawn after a change uploads it: every
   * other object kept the count it was created with (0 when a page loads with no cue: the haze was lit, the floor
   * and objects were not).
   */
  readonly countNode = uniform(0, "int").setGroup(renderGroup);
  readonly shadows = new ShadowLayers();

  private readonly lights = new Set<TableLight>();
  private freeShadowLayers = Array.from({ length: this.shadows.layerCount }, (_, i) => i).reverse();
  private warnedCapacity = false;

  constructor() {
    this.texture = new DataTexture(this.data, LIGHT_CAPACITY, LIGHT_ROWS, RGBAFormat, FloatType);
    this.texture.minFilter = NearestFilter;
    this.texture.magFilter = NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
  }

  get size() {
    return this.lights.size;
  }

  add(light: TableLight) {
    this.lights.add(light);
    if (light.castShadow && light.shadowLayer < 0) {
      if (this.freeShadowLayers.length === 0) {
        // Out of layers: make the array bigger, and hand out the new ones lowest first.
        const before = this.shadows.layerCount;
        if (this.shadows.grow()) {
          for (let layer = this.shadows.layerCount - 1; layer >= before; layer--) this.freeShadowLayers.push(layer);
        }
      }
      const layer = this.freeShadowLayers.pop();
      if (layer === undefined) console.warn("LightTable: no free shadow layer; this light will not cast a shadow");
      else {
        light.shadowLayer = layer;
        this.shadows.invalidate(layer);
      }
    }
  }

  remove(light: TableLight) {
    if (!this.lights.delete(light)) return;
    if (light.shadowLayer >= 0) {
      this.freeShadowLayers.push(light.shadowLayer);
      light.shadowLayer = -1;
    }
  }

  /**
   * Packs the lit lights into the texture. Call once per drawn frame, after world matrices are up to date and after
   * the effect player has written this frame's colours. Uploads the texture only if something changed.
   */
  update() {
    const { data } = this;
    let changed = false;
    const write = (offset: number, value: number) => {
      const rounded = Math.fround(value);
      if (data[offset] !== rounded) {
        data[offset] = rounded;
        changed = true;
      }
    };
    const rowStride = LIGHT_CAPACITY * 4;

    let count = 0;
    for (const light of this.lights) {
      const strength = light.intensity * light.intensityScale;
      const { r, g, b } = light.color;
      if (!light.parent || strength <= 0 || (r <= 0 && g <= 0 && b <= 0)) continue; // off: not in the table at all
      if (count === LIGHT_CAPACITY) {
        if (!this.warnedCapacity) console.warn(`LightTable: more than ${LIGHT_CAPACITY} lit lights; the rest are dark`);
        this.warnedCapacity = true;
        break;
      }

      const world = light.parent.matrixWorld;
      position.copy(light.localPosition).applyMatrix4(world);
      direction.set(0, 1, 0).transformDirection(world);
      const coneCos = Math.cos(light.angle);
      const penumbraCos = Math.cos(light.angle * (1 - light.penumbra));

      // The shadow follows the light's pose even while other data is unchanged.
      if (light.shadowLayer >= 0) this.shadows.setPose(light.shadowLayer, position, direction, light.angle, light.distance);

      const column = count * 4;
      // Row 0: world position, reach.
      write(column, position.x);
      write(column + 1, position.y);
      write(column + 2, position.z);
      write(column + 3, light.distance);
      // Row 1: world direction of the beam, cosine of the cone's edge.
      write(rowStride + column, direction.x);
      write(rowStride + column + 1, direction.y);
      write(rowStride + column + 2, direction.z);
      write(rowStride + column + 3, coneCos);
      // Row 2: colour × intensity (linear), cosine where the penumbra starts.
      write(rowStride * 2 + column, r * strength);
      write(rowStride * 2 + column + 1, g * strength);
      write(rowStride * 2 + column + 2, b * strength);
      write(rowStride * 2 + column + 3, penumbraCos);
      // Row 3: shadow layer, or -1.
      write(rowStride * 3 + column, light.shadowLayer);
      count++;
    }

    if (this.countNode.value !== count) {
      this.countNode.value = count;
      changed = true;
    }
    if (changed) this.texture.needsUpdate = true;
    return changed;
  }

  dispose() {
    this.texture.dispose();
    this.shadows.dispose();
  }
}
