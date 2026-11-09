import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { GUI } from "lil-gui";
import type { PatchedFixture } from "../../../types-v2/patchedFixture";
import { useAppStore } from "../../../store/appStore";
import { PLANE_SIZE } from "../../../utils/visualiser-v2";
import {
  AlignTo,
  ArrangeOrder,
  Axis,
  align,
  distribute,
  fan,
  getCentre,
  placementFromObject3D,
  placementsChanged,
  roundPlacement,
  spread,
  toPlacement,
  type Placement,
} from "../../../utils/visualiser-v2-selection";
import { Visualiser3DTransformControls } from "./Visualiser3DTransformControls";

/** Where "Reset position" puts fixtures, in cm (5 m up, above the stage centre). */
const RESET_POSITION_CM = { x: 0, y: 500, z: 0 };

type DragState = {
  pivotStartInverse: THREE.Matrix4;
  /** Each mesh's matrix when the drag started. */
  starts: Map<string, THREE.Matrix4>;
};

/**
 * One gizmo and one lil-gui panel for the whole fixture selection (1 or many).
 *
 * The gizmo is attached to an invisible pivot at the selection's centre. While it moves, the pivot's change since the
 * start (pivotNow × pivotStart⁻¹) is applied to every selected mesh. On release, the meshes are read back and saved
 * with `onCommit` in one request. The lil-gui fields drive the same pivot, so typing a number is the same as dragging.
 */
export const Visualiser3DSelectionTransform = ({
  fixtures,
  getMesh,
  gui,
  onCommit,
}: {
  /** Selected fixtures, in selection order (e.g. a group's fixtureIds order). */
  fixtures: PatchedFixture[];
  getMesh: (fixtureId: string) => THREE.Object3D | undefined;
  gui: GUI | null;
  onCommit: (placements: Placement[]) => void;
}) => {
  const mode = useAppStore((state) => state.transformMode);
  const pivot = useMemo(() => new THREE.Object3D(), []);
  const drag = useRef<DragState | null>(null);

  const placements = fixtures.map(toPlacement);
  const isSingle = fixtures.length === 1;

  // Read through a ref so the callbacks below never go stale (the lil-gui folder is created once per selection).
  const latest = useRef({ placements, getMesh, onCommit, isSingle });
  latest.current = { placements, getMesh, onCommit, isSingle };

  /** Values shown in lil-gui: metres and degrees. For a multi-selection, rotation means "rotate by". */
  const proxy = useMemo(() => ({ position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }), []);

  /** Arrange settings survive selection changes. */
  const arrange = useMemo(
    () => ({
      axis: Axis.X as Axis,
      order: ArrangeOrder.POSITION as ArrangeOrder,
      spacing: 100,
      fanAxis: Axis.X as Axis,
      fanStep: 0,
    }),
    [],
  );

  const updateProxyFromPivot = () => {
    proxy.position.x = pivot.position.x;
    proxy.position.y = pivot.position.y;
    proxy.position.z = pivot.position.z;
    proxy.rotation.x = THREE.MathUtils.radToDeg(pivot.rotation.x);
    proxy.rotation.y = THREE.MathUtils.radToDeg(pivot.rotation.y);
    proxy.rotation.z = THREE.MathUtils.radToDeg(pivot.rotation.z);
  };

  /** Put the pivot on the selection's centre. A single fixture's pivot also takes its rotation (for local rotate). */
  const resetPivot = () => {
    const { placements, isSingle } = latest.current;
    const centre = getCentre(placements);
    if (!centre) return;
    pivot.position.set(centre.x / 100, centre.y / 100, centre.z / 100);
    if (isSingle) {
      const [p] = placements;
      pivot.rotation.set(
        THREE.MathUtils.degToRad(p.rotX),
        THREE.MathUtils.degToRad(p.rotY),
        THREE.MathUtils.degToRad(p.rotZ),
      );
    } else {
      pivot.rotation.set(0, 0, 0);
    }
    pivot.updateMatrix();
    updateProxyFromPivot();
  };

  const begin = () => {
    pivot.updateMatrix();
    const starts = new Map<string, THREE.Matrix4>();
    for (const { id } of latest.current.placements) {
      const mesh = latest.current.getMesh(id);
      if (!mesh) continue;
      mesh.updateMatrix();
      starts.set(id, mesh.matrix.clone());
    }
    drag.current = { pivotStartInverse: pivot.matrix.clone().invert(), starts };
  };

  /** Move every mesh by how far the pivot moved since `begin`. */
  const apply = () => {
    const state = drag.current;
    if (!state) return;
    pivot.updateMatrix();
    const delta = pivot.matrix.clone().multiply(state.pivotStartInverse);
    const matrix = new THREE.Matrix4();
    for (const [id, start] of state.starts) {
      const mesh = latest.current.getMesh(id);
      if (!mesh) continue;
      // Fixture meshes sit directly in the scene, so their local matrix is their world matrix.
      matrix.multiplyMatrices(delta, start).decompose(mesh.position, mesh.quaternion, mesh.scale);
    }
    updateProxyFromPivot();
  };

  const end = () => {
    const state = drag.current;
    if (!state) return;
    drag.current = null;

    const next: Placement[] = [];
    for (const id of state.starts.keys()) {
      const mesh = latest.current.getMesh(id);
      if (mesh) next.push(placementFromObject3D(id, mesh));
    }
    if (placementsChanged(latest.current.placements, next)) {
      // The new placements come back through props, which re-centres the pivot (see the layout effect).
      latest.current.onCommit(next);
    } else {
      resetPivot();
    }
  };

  /** Run a pure selection op on the saved placements and save the result. */
  const run = (op: (placements: Placement[]) => Placement[]) => {
    if (drag.current) return;
    const current = latest.current.placements;
    const next = op(current).map(roundPlacement);
    if (placementsChanged(current, next)) latest.current.onCommit(next);
  };

  const placementsKey = placements
    .map((p) => [p.id, p.posX, p.posY, p.posZ, p.rotX, p.rotY, p.rotZ].join(","))
    .join("|");
  useLayoutEffect(() => {
    if (!drag.current) resetPivot();
    // resetPivot reads everything through refs; placementsKey is what actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placementsKey]);

  const idsKey = fixtures.map((f) => f.id).join("|");
  const title = isSingle ? fixtures[0].name.trim() || "Fixture" : `${fixtures.length} fixtures selected`;

  useEffect(() => {
    if (!gui || fixtures.length === 0) return;

    const folder = gui.addFolder(title);
    const cleanups: (() => void)[] = [];

    // Typing in a field moves the pivot, exactly like dragging the gizmo.
    const live = <T extends { onChange: (fn: () => void) => T; onFinishChange: (fn: () => void) => T }>(
      controller: T,
      setPivot: () => void,
    ) =>
      controller
        .onChange(() => {
          if (!drag.current) begin();
          setPivot();
          apply();
        })
        .onFinishChange(end);

    const axisNames = { x: "x (Red)", y: "y (Green)", z: "z (Blue)" } as const;
    const positionFolder = folder.addFolder(isSingle ? "Position (m)" : "Centre (m)");
    for (const axis of Object.values(Axis)) {
      live(
        positionFolder
          .add(proxy.position, axis, -PLANE_SIZE / 2, PLANE_SIZE / 2, 0.001)
          .decimals(3)
          .name(axisNames[axis])
          .listen(),
        () => (pivot.position[axis] = proxy.position[axis]),
      );
    }
    positionFolder
      .add(
        {
          reset: () =>
            run((p) =>
              p.map((f) => ({ ...f, posX: RESET_POSITION_CM.x, posY: RESET_POSITION_CM.y, posZ: RESET_POSITION_CM.z })),
            ),
        },
        "reset",
      )
      .name(isSingle ? "Reset position" : "Reset all positions");

    const rotationFolder = folder.addFolder(isSingle ? "Rotation (°)" : "Rotate by (°)");
    for (const axis of Object.values(Axis)) {
      live(rotationFolder.add(proxy.rotation, axis, -180, 180, 0.1).decimals(1).name(axisNames[axis]).listen(), () =>
        pivot.rotation.set(
          THREE.MathUtils.degToRad(proxy.rotation.x),
          THREE.MathUtils.degToRad(proxy.rotation.y),
          THREE.MathUtils.degToRad(proxy.rotation.z),
        ),
      );
    }
    rotationFolder
      .add({ reset: () => run((p) => p.map((f) => ({ ...f, rotX: 0, rotY: 0, rotZ: 0 }))) }, "reset")
      .name(isSingle ? "Reset rotation" : "Reset all rotations");

    if (fixtures.length >= 2) {
      const arrangeFolder = folder.addFolder("Arrange");
      arrangeFolder
        .add(arrange, "axis", { "x (Red)": Axis.X, "y (Green, height)": Axis.Y, "z (Blue)": Axis.Z })
        .name("Line axis (world)");
      arrangeFolder
        .add(arrange, "order", { "By position": ArrangeOrder.POSITION, "By selection order": ArrangeOrder.SELECTION })
        .name("Order");

      const actions = {
        alignMin: () => run((p) => align(p, arrange.axis, AlignTo.MIN)),
        alignCentre: () => run((p) => align(p, arrange.axis, AlignTo.CENTRE)),
        alignMax: () => run((p) => align(p, arrange.axis, AlignTo.MAX)),
        distribute: () => run((p) => distribute(p, arrange.axis, arrange.order)),
      };

      // Sliders compute from the saved placements every time, so dragging back and forth never compounds.
      // Spread keeps the centre and fan keeps positions, so the pivot doesn't need to move.
      /** Show placements on the meshes without saving. */
      const preview = (next: Placement[]) => {
        if (drag.current) return;
        for (const p of next) {
          const mesh = latest.current.getMesh(p.id);
          if (!mesh) continue;
          mesh.position.set(p.posX / 100, p.posY / 100, p.posZ / 100);
          mesh.rotation.set(
            THREE.MathUtils.degToRad(p.rotX),
            THREE.MathUtils.degToRad(p.rotY),
            THREE.MathUtils.degToRad(p.rotZ),
          );
        }
      };
      const spreadSaved = (p: Placement[]) => spread(p, arrange.axis, arrange.spacing, arrange.order);
      const fanSaved = (p: Placement[]) => fan(p, arrange.fanAxis, arrange.fanStep, arrange.axis, arrange.order);
      arrangeFolder.add(actions, "alignMin").name("Align to min");
      arrangeFolder.add(actions, "alignCentre").name("Align to centre");
      arrangeFolder.add(actions, "alignMax").name("Align to max");
      const distributeButton = arrangeFolder.add(actions, "distribute").name("Distribute evenly");
      if (fixtures.length < 3) distributeButton.disable();
      // Live preview while dragging (meshes only), one save on release. Negative spacing reverses the order.
      arrangeFolder
        .add(arrange, "spacing", -2000, 2000, 1)
        .name("Spread spacing (cm)")
        .onChange(() => preview(spreadSaved(latest.current.placements)))
        .onFinishChange(() => run(spreadSaved));

      // Fan: absolute angles around a LOCAL axis of the middle fixture. Order comes from "Line axis" + "Order".
      const fanFolder = arrangeFolder.addFolder("Fan angles");
      fanFolder
        .add(arrange, "fanAxis", { "x (Red)": Axis.X, "y (Green)": Axis.Y, "z (Blue)": Axis.Z })
        .name("Turn around (local)");
      fanFolder
        .add(arrange, "fanStep", -90, 90, 0.5)
        .name("Fan step (°)")
        .onChange(() => preview(fanSaved(latest.current.placements)))
        .onFinishChange(() => run(fanSaved));
      fanFolder
        .add(
          { alignRotation: () => run((p) => fan(p, arrange.fanAxis, 0, arrange.axis, arrange.order)) },
          "alignRotation",
        )
        .name("Same angle as middle fixture");

      // Local axes are invisible otherwise: while the pointer is over the fan controls, draw each fixture's
      // red/green/blue axes (same colours as the dropdown and the gizmo).
      const helpers: THREE.AxesHelper[] = [];
      const showAxes = () => {
        hideAxes();
        for (const { id } of latest.current.placements) {
          const mesh = latest.current.getMesh(id);
          if (!mesh) continue;
          const helper = new THREE.AxesHelper(0.5);
          // Draw on top of the fixture body.
          (helper.material as THREE.Material).depthTest = false;
          helper.renderOrder = 999;
          helper.raycast = () => {};
          mesh.add(helper);
          helpers.push(helper);
        }
      };
      const hideAxes = () => {
        for (const helper of helpers.splice(0)) {
          helper.removeFromParent();
          helper.dispose();
        }
      };
      fanFolder.domElement.addEventListener("pointerenter", showAxes);
      fanFolder.domElement.addEventListener("pointerleave", hideAxes);
      cleanups.push(hideAxes);
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
      folder.destroy();
    };
    // The callbacks read through refs; the folder only needs rebuilding when the selection itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gui, idsKey, title]);

  if (fixtures.length === 0) return null;

  return (
    <>
      {/* TransformControls needs its object in the scene graph. */}
      <primitive object={pivot} />
      <Visualiser3DTransformControls
        object={pivot}
        // Fixtures can't be scaled.
        mode={mode === "scale" ? "translate" : mode}
        space={mode === "rotate" ? "local" : "world"}
        onMouseDown={() => begin()}
        onObjectChange={() => apply()}
        onMouseUp={() => end()}
      />
    </>
  );
};
