import { Euler, MathUtils, Quaternion, Vector3, type Object3D } from "three";
import type { PatchedFixture } from "../types-v2/patchedFixture";
import { convert3DPositionToStored, convert3DRotationToStored } from "./visualiser-v2";

/**
 * Pure operations on a selection of fixtures. Every arrange tool (gizmo drag, align, distribute, spread, ...)
 * produces new placements here, then the caller saves them in one bulk upsert.
 *
 * Units are the stored ones: centimetres and degrees (Euler order XYZ, same as three.js).
 */
export type Placement = Pick<PatchedFixture, "id" | "posX" | "posY" | "posZ" | "rotX" | "rotY" | "rotZ">;

export type Vec3 = { x: number; y: number; z: number };

export const Axis = { X: "x", Y: "y", Z: "z" } as const;
export type Axis = (typeof Axis)[keyof typeof Axis];

export const AlignTo = { MIN: "min", CENTRE: "centre", MAX: "max" } as const;
export type AlignTo = (typeof AlignTo)[keyof typeof AlignTo];

/** How to order fixtures along the line for distribute/spread. */
export const ArrangeOrder = {
  /** Keep the current order along the axis (left stays left). */
  POSITION: "position",
  /** Use the order of the given array, e.g. a fixture group's fixtureIds. */
  SELECTION: "selection",
} as const;
export type ArrangeOrder = (typeof ArrangeOrder)[keyof typeof ArrangeOrder];

const POS_KEY = { x: "posX", y: "posY", z: "posZ" } as const satisfies Record<Axis, keyof Placement>;

export const toPlacement = ({ id, posX, posY, posZ, rotX, rotY, rotZ }: Placement): Placement => ({
  id,
  posX,
  posY,
  posZ,
  rotX,
  rotY,
  rotZ,
});

/** Round to 0.01 (0.1 mm / 0.01°). `+ 0` turns -0 into 0. */
const round = (value: number) => Math.round(value * 100) / 100 + 0;

/**
 * Remove float noise from matrix maths (e.g. rotX 1.4e-14 instead of 0), so saved values are clean and
 * typing the value you meant (0) counts as a change.
 */
export const roundPlacement = (p: Placement): Placement => ({
  id: p.id,
  posX: round(p.posX),
  posY: round(p.posY),
  posZ: round(p.posZ),
  rotX: round(p.rotX),
  rotY: round(p.rotY),
  rotZ: round(p.rotZ),
});

/** Read a placement back from a mesh that sits directly in the scene (local = world). Rounded. */
export const placementFromObject3D = (id: string, object: Object3D): Placement => {
  const [posX, posY, posZ] = convert3DPositionToStored([object.position.x, object.position.y, object.position.z]);
  const [rotX, rotY, rotZ] = convert3DRotationToStored([object.rotation.x, object.rotation.y, object.rotation.z]);
  return roundPlacement({ id, posX, posY, posZ, rotX, rotY, rotZ });
};

/** Centre of the selection's bounding box, in cm. Null for an empty selection. */
export const getCentre = (placements: Placement[]): Vec3 | null => {
  if (placements.length === 0) return null;
  const centreOf = (axis: Axis) => {
    const values = placements.map((p) => p[POS_KEY[axis]]);
    return (Math.min(...values) + Math.max(...values)) / 2;
  };
  return { x: centreOf("x"), y: centreOf("y"), z: centreOf("z") };
};

export const moveBy = (placements: Placement[], delta: Vec3): Placement[] =>
  placements.map((p) => ({ ...p, posX: p.posX + delta.x, posY: p.posY + delta.y, posZ: p.posZ + delta.z }));

/** Rotate every fixture around `pivot` (cm) by `degrees`; each fixture also turns by the same amount. */
export const rotateAround = (placements: Placement[], pivot: Vec3, degrees: Vec3): Placement[] => {
  const turn = new Quaternion().setFromEuler(
    new Euler(MathUtils.degToRad(degrees.x), MathUtils.degToRad(degrees.y), MathUtils.degToRad(degrees.z)),
  );
  const pivotVec = new Vector3(pivot.x, pivot.y, pivot.z);

  return placements.map((p) => {
    const position = new Vector3(p.posX, p.posY, p.posZ).sub(pivotVec).applyQuaternion(turn).add(pivotVec);
    const own = new Quaternion().setFromEuler(
      new Euler(MathUtils.degToRad(p.rotX), MathUtils.degToRad(p.rotY), MathUtils.degToRad(p.rotZ)),
    );
    const rotation = new Euler().setFromQuaternion(turn.clone().multiply(own));
    return {
      ...p,
      posX: position.x,
      posY: position.y,
      posZ: position.z,
      rotX: MathUtils.radToDeg(rotation.x),
      rotY: MathUtils.radToDeg(rotation.y),
      rotZ: MathUtils.radToDeg(rotation.z),
    };
  });
};

/** Put every fixture on the same line along `axis`: the lowest, the centre or the highest value. */
export const align = (placements: Placement[], axis: Axis, to: AlignTo): Placement[] => {
  if (placements.length < 2) return placements;
  const key = POS_KEY[axis];
  const values = placements.map((p) => p[key]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const target = to === AlignTo.MIN ? min : to === AlignTo.MAX ? max : (min + max) / 2;
  return placements.map((p) => ({ ...p, [key]: target }));
};

/** Indexes of `placements` in the order they should sit along `axis`. */
const orderIndexes = (placements: Placement[], axis: Axis, order: ArrangeOrder): number[] => {
  const indexes = placements.map((_, i) => i);
  if (order === ArrangeOrder.SELECTION) return indexes;
  const key = POS_KEY[axis];
  // Ties keep their array order, so repeated runs give the same result.
  return indexes.sort((a, b) => placements[a][key] - placements[b][key] || a - b);
};

/** Keep the first and last fixture where they are and space the others evenly between them. */
export const distribute = (
  placements: Placement[],
  axis: Axis,
  order: ArrangeOrder = ArrangeOrder.POSITION,
): Placement[] => {
  if (placements.length < 3) return placements;
  const key = POS_KEY[axis];
  const indexes = orderIndexes(placements, axis, order);
  const start = placements[indexes[0]][key];
  const end = placements[indexes[indexes.length - 1]][key];
  const step = (end - start) / (indexes.length - 1);

  const result = [...placements];
  indexes.forEach((index, i) => {
    result[index] = { ...placements[index], [key]: start + step * i };
  });
  return result;
};

/** Space fixtures exactly `spacing` cm apart along `axis`, centred on where the selection is now. */
export const spread = (
  placements: Placement[],
  axis: Axis,
  spacing: number,
  order: ArrangeOrder = ArrangeOrder.POSITION,
): Placement[] => {
  if (placements.length < 2) return placements;
  const key = POS_KEY[axis];
  const centre = getCentre(placements)![axis];
  const indexes = orderIndexes(placements, axis, order);
  const offset = ((indexes.length - 1) * spacing) / 2;

  const result = [...placements];
  indexes.forEach((index, i) => {
    result[index] = { ...placements[index], [key]: centre - offset + spacing * i };
  });
  return result;
};

/**
 * True when any position or rotation differs. Exact by default: round `after` first (see `roundPlacement`), so noisy
 * saved values (1.4e-14) still count as changed when the rounded value (0) is typed.
 */
export const placementsChanged = (before: Placement[], after: Placement[], epsilon = 0): boolean => {
  const byId = new Map(before.map((p) => [p.id, p]));
  const keys = ["posX", "posY", "posZ", "rotX", "rotY", "rotZ"] as const;
  return after.some((p) => {
    const old = byId.get(p.id);
    return !old || keys.some((k) => Math.abs(old[k] - p[k]) > epsilon);
  });
};
