/**
 * Every fixture lens in the canvas, drawn as two instanced meshes (round and square) instead of one mesh per head
 * (optimization plan, step 6). A 1024-head scene went from 1024 lens draw calls to one.
 *
 * Fixtures register a `Lens` per head. `update()` runs once per drawn frame and copies each lens's place and colour
 * into the instance buffers, uploading only what changed.
 */
import { createContext } from "react";
import * as THREE from "three";

/**
 * One head's lens. `color` is what the lens shows (already mixed from the head's colour and intensity), so the effect
 * player writes to a Lens exactly as it would to a lens material.
 */
export type Lens = {
  color: THREE.Color;
  /** The lens sits at `localMatrix` in this object's space. */
  parent: THREE.Object3D | null;
  /** Position, facing and size of the lens within the fixture. Constant. */
  localMatrix: THREE.Matrix4;
  round: boolean;
};

const facingUp = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));

/** A lens on the fixture's top face, facing along the beam (local +Y). `size`: along local X and local Z. */
export const createLens = (position: [number, number, number], size: [number, number], round: boolean): Lens => ({
  color: new THREE.Color(0, 0, 0),
  parent: null,
  localMatrix: new THREE.Matrix4().compose(
    // Slightly above the face, so it doesn't fight with it for depth.
    new THREE.Vector3(position[0], position[1] + 0.0005, position[2]),
    // The unit circle and plane face +Z; turn them to face +Y.
    facingUp,
    // The unit circle has radius 1, the unit plane is 1 × 1.
    round ? new THREE.Vector3(size[0] / 2, size[0] / 2, 1) : new THREE.Vector3(size[0], size[1], 1),
  ),
  round,
});

const INITIAL_CAPACITY = 64;
const matrix = new THREE.Matrix4();

/** One instanced mesh and the lenses drawn with it. */
class LensBatch {
  mesh: THREE.InstancedMesh;
  readonly lenses: Lens[] = [];
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.Material;
  private readonly group: THREE.Group;

  constructor(group: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material) {
    this.group = group;
    this.geometry = geometry;
    this.material = material;
    this.mesh = this.createMesh(INITIAL_CAPACITY);
  }

  private createMesh(capacity: number) {
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    mesh.name = "Fixture lenses";
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    mesh.count = 0;
    // Instances are spread over the whole stage, and lenses never take clicks.
    mesh.frustumCulled = false;
    mesh.raycast = () => {};
    this.group.add(mesh);
    return mesh;
  }

  /** Copies every lens into the instance buffers. Returns whether anything changed. */
  update() {
    const { lenses } = this;
    if (lenses.length > this.mesh.instanceMatrix.count) {
      // Out of room: a bigger mesh, filled from scratch below.
      this.group.remove(this.mesh);
      this.mesh.dispose();
      this.mesh = this.createMesh(Math.max(lenses.length, this.mesh.instanceMatrix.count * 2));
    }

    const { mesh } = this;
    const matrices = mesh.instanceMatrix.array as Float32Array;
    const colours = mesh.instanceColor!.array as Float32Array;
    let matricesChanged = false;
    let coloursChanged = false;
    let lastParent: THREE.Object3D | null = null;

    for (let i = 0; i < lenses.length; i++) {
      const lens = lenses[i];
      if (!lens.parent) continue;
      // Gizmos move fixtures without a render in between. Lenses of one fixture are next to each other in the list.
      if (lens.parent !== lastParent) {
        lens.parent.updateWorldMatrix(true, false);
        lastParent = lens.parent;
      }
      matrix.multiplyMatrices(lens.parent.matrixWorld, lens.localMatrix);
      const elements = matrix.elements;
      for (let k = 0; k < 16; k++) {
        const value = Math.fround(elements[k]);
        if (matrices[i * 16 + k] !== value) {
          matrices[i * 16 + k] = value;
          matricesChanged = true;
        }
      }
      const r = Math.fround(lens.color.r);
      const g = Math.fround(lens.color.g);
      const b = Math.fround(lens.color.b);
      if (colours[i * 3] !== r || colours[i * 3 + 1] !== g || colours[i * 3 + 2] !== b) {
        colours[i * 3] = r;
        colours[i * 3 + 1] = g;
        colours[i * 3 + 2] = b;
        coloursChanged = true;
      }
    }

    const countChanged = mesh.count !== lenses.length;
    mesh.count = lenses.length;
    if (matricesChanged) mesh.instanceMatrix.needsUpdate = true;
    if (coloursChanged) mesh.instanceColor!.needsUpdate = true;
    return matricesChanged || coloursChanged || countChanged;
  }

  /** Frees GPU resources. The batch stays usable: three creates them again if it is drawn. */
  dispose() {
    this.mesh.dispose();
    this.geometry.dispose();
  }
}

export class LensInstances {
  /** Add this to the scene (at the root, untransformed: instances are placed in world space). */
  readonly group = new THREE.Group();
  private readonly material = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false });
  private readonly round = new LensBatch(this.group, new THREE.CircleGeometry(1, 32), this.material);
  private readonly square = new LensBatch(this.group, new THREE.PlaneGeometry(1, 1), this.material);

  add(lens: Lens) {
    (lens.round ? this.round : this.square).lenses.push(lens);
  }

  remove(lens: Lens) {
    const { lenses } = lens.round ? this.round : this.square;
    const index = lenses.indexOf(lens);
    if (index !== -1) lenses.splice(index, 1);
  }

  /** Call once per drawn frame, after the effect player has written this frame's colours. */
  update() {
    const roundChanged = this.round.update();
    const squareChanged = this.square.update();
    return roundChanged || squareChanged;
  }

  dispose() {
    this.round.dispose();
    this.square.dispose();
    this.material.dispose();
  }
}

export const LensInstancesContext = createContext<LensInstances | null>(null);
