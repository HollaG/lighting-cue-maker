import { describe, expect, it } from "vitest";
import { Euler, MathUtils, Quaternion, Vector3 } from "three";
import {
  AlignTo,
  ArrangeOrder,
  align,
  distribute,
  fan,
  getCentre,
  moveBy,
  placementsChanged,
  rotateAround,
  roundPlacement,
  spread,
  type Placement,
} from "../visualiser-v2-selection";

const at = (id: string, posX: number, posY = 0, posZ = 0): Placement => ({
  id,
  posX,
  posY,
  posZ,
  rotX: 0,
  rotY: 0,
  rotZ: 0,
});

const xs = (placements: Placement[]) => placements.map((p) => p.posX);

describe("selection ops", () => {
  it("getCentre uses the bounding box", () => {
    expect(getCentre([at("a", 0), at("b", 10), at("c", 100)])).toEqual({ x: 50, y: 0, z: 0 });
    expect(getCentre([])).toBeNull();
  });

  it("moveBy shifts every fixture", () => {
    expect(xs(moveBy([at("a", 0), at("b", 10)], { x: 5, y: 0, z: 0 }))).toEqual([5, 15]);
  });

  it("align snaps to min, centre or max", () => {
    const placements = [at("a", 0, 100), at("b", 0, 300)];
    expect(align(placements, "y", AlignTo.MIN).map((p) => p.posY)).toEqual([100, 100]);
    expect(align(placements, "y", AlignTo.CENTRE).map((p) => p.posY)).toEqual([200, 200]);
    expect(align(placements, "y", AlignTo.MAX).map((p) => p.posY)).toEqual([300, 300]);
  });

  it("distribute keeps the ends and keeps the left-to-right order", () => {
    // array order differs from position order on purpose
    expect(xs(distribute([at("a", 100), at("b", 0), at("c", 10)], "x"))).toEqual([100, 0, 50]);
  });

  it("spread centres on the current centre with fixed spacing", () => {
    expect(xs(spread([at("a", 0), at("b", 5), at("c", 40)], "x", 50))).toEqual([-30, 20, 70]);
  });

  it("spread with negative spacing reverses the order", () => {
    expect(xs(spread([at("a", 0), at("b", 5), at("c", 40)], "x", -50))).toEqual([70, 20, -30]);
  });

  it("spread by selection order follows the array, not positions", () => {
    expect(xs(spread([at("a", 100), at("b", 0)], "x", 100, ArrangeOrder.SELECTION))).toEqual([0, 100]);
  });

  it("rotateAround turns positions and rotations around the pivot", () => {
    const [p] = rotateAround([at("a", 100)], { x: 0, y: 0, z: 0 }, { x: 0, y: 90, z: 0 });
    expect(p.posX).toBeCloseTo(0);
    expect(p.posZ).toBeCloseTo(-100);
    expect(p.rotY).toBeCloseTo(90);
  });

  it("fan: absolute, middle fixture's angle is the base, negative step reverses", () => {
    const placements = [at("a", 0), { ...at("b", 100), rotY: 30 }, { ...at("c", 200), rotY: 77 }];
    expect(fan(placements, "y", 10, "x").map((p) => Math.round(p.rotY))).toEqual([20, 30, 40]);
    expect(fan(placements, "y", -10, "x").map((p) => Math.round(p.rotY))).toEqual([40, 30, 20]);
    expect(fan(placements, "y", 0, "x").map((p) => Math.round(p.rotY))).toEqual([30, 30, 30]);
    expect(fan(placements, "y", 10, "x").map((p) => p.posX)).toEqual([0, 100, 200]);
  });

  it("fan turns around the LOCAL axis of the base rotation", () => {
    // Base is tilted 90° around X, so its local Z points along world -Y (down).
    const tilted = (id: string, x: number) => ({ ...at(id, x), rotX: 90 });
    const [first] = fan([tilted("a", 0), tilted("b", 100)], "z", 20, "x");
    const q = new Quaternion().setFromEuler(
      new Euler(MathUtils.degToRad(first.rotX), MathUtils.degToRad(first.rotY), MathUtils.degToRad(first.rotZ)),
    );
    // Turning around that local axis must not change where local Z points.
    const localZ = new Vector3(0, 0, 1).applyQuaternion(q);
    expect(localZ.y).toBeCloseTo(-1);
  });

  it("roundPlacement removes float noise and -0", () => {
    const rounded = roundPlacement({ ...at("a", 99.99999999), rotX: 1.4e-14, rotY: -1e-9 });
    expect(rounded.posX).toBe(100);
    expect(rounded.rotX).toBe(0);
    expect(Object.is(rounded.rotY, 0)).toBe(true);
  });

  it("placementsChanged: typing 0 over a noisy saved value counts as a change", () => {
    const saved = { ...at("a", 0), rotX: 1.4e-14 };
    expect(placementsChanged([saved], [roundPlacement({ ...saved, rotX: 0 })])).toBe(true);
    expect(placementsChanged([at("a", 0)], [roundPlacement(at("a", 0.0000001))])).toBe(false);
  });
});
