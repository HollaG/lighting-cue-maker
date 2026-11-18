import { useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useMantineTheme } from "@mantine/core";
import * as THREE from "three";
import type { PatchedFixture } from "../../../types-v2/patchedFixture";
import type { FixtureTemplate } from "../../../types-v2/fixtureTemplates";
import { getFixture3DPosition, getFixture3DRotation } from "../../../utils/visualiser-v2";
import {
  getBeamAngle,
  getBrightnessScale,
  getFixtureBody,
  getHeadLayouts,
  type HeadLayout,
} from "../../../utils/visualiser-v2-heads";
import { VOLUMETRIC_LIGHT_MASK } from "../visualiser3DRenderer";
import { decodeHeadStates, getHeadDecoder } from "../../../utils/visualiser-v2-decoder";
import { HeadSinkContext, LENS_OFF_COLOUR, writeHead, type HeadLensTarget, type HeadLightTarget } from "./headSinks";
import { LensInstancesContext, createLens } from "./LensInstances";
import { useThree } from "@react-three/fiber";
import { createTableLight, type LightTable } from "../LightTable/LightTable";
import { useLightTable } from "../LightTable/useLightTable";

/** What one head shows right now. Later this comes from the decoder (DMX → per-head state). */
export type HeadState = {
  /** #rrggbb at full brightness. */
  colour: string;
  /** 0–100 */
  intensity: number;
};

const OFF: HeadState = { colour: "#ffffff", intensity: 0 };
const SELECTED: HeadState = { colour: "#ffffff", intensity: 100 };
const OUTLINE = 0.004;
const restoreColour = new THREE.Color();
const lensColour = new THREE.Color();

/**
 * Any fixture: a body, one lens per head, and the head lights.
 *
 * One head = one beam. Heads come from the fixture's mode and are laid out on the body's top face; beams point along
 * local +Y. The outer mesh is what the selection gizmo moves (registered through `onMeshChange`).
 */
export const Visualiser3DFixture = ({
  fixture,
  fixtureTemplate,
  dmxValues,
  isSelected,
  onSelect,
  onMeshChange,
  headStates,
  castShadow = false,
  viewOnly = false,
}: {
  fixture: PatchedFixture;
  fixtureTemplate: FixtureTemplate | undefined;

  /** This fixture's DMX values, one per slot of its mode. Missing = no cue data (off, or white while selected). */
  dmxValues?: (number | null)[];

  isSelected: boolean;
  /** `additive`: shift/ctrl/cmd was held, so add to or remove from the selection instead of replacing it. */
  onSelect: (fixtureId: string, additive: boolean) => void;
  /** Registers the mesh so the selection gizmo can move it. */
  onMeshChange?: (fixtureId: string, mesh: THREE.Mesh | null) => void;

  /** Per head, in head order. Missing = off, or full white while selected in the editor. */
  headStates?: HeadState[];
  /** Only a few lights may cast shadows (WebGPU texture limit); StagePreview3D decides which. */
  castShadow?: boolean;
  viewOnly?: boolean;
}) => {
  const theme = useMantineTheme();

  const heads = useMemo(() => getHeadLayouts(fixtureTemplate, fixture.modeId), [fixtureTemplate, fixture.modeId]);
  const body = useMemo(
    () => getFixtureBody(heads.length, fixtureTemplate?.properties),
    [heads.length, fixtureTemplate],
  );
  const beamAngle = getBeamAngle(fixtureTemplate?.properties);
  // Per-model calibration (LD-set, %), so models look as bright relative to each other as in real life.
  // Only the lights: lenses still lerp by intensity alone, so a dimmed model's lens still reads as "on".
  const brightness = getBrightnessScale(fixtureTemplate?.properties);

  // To let LDs view the fixtures better when building the scene, set the intensity to SELECTED when in build mode (viewOnly = false)
  // Else, follow DMX values.

  // DMX → one state per head (same order as `heads`). Only redone when this fixture's values or template change.
  const decodedStates = useMemo(
    () => (dmxValues ? decodeHeadStates(dmxValues, fixtureTemplate, fixture.modeId) : undefined),
    [dmxValues, fixtureTemplate, fixture.modeId],
  );

  // Per head: selected in build mode → white; else the `headStates` prop if given, else the DMX, else off.
  const states = heads.map((_, i) =>
    isSelected && !viewOnly ? SELECTED : (headStates?.[i] ?? decodedStates?.[i] ?? OFF),
  );

  // --- Pattern effects: the canvas's effect player writes lens and light values directly, every frame ---
  const registry = useContext(HeadSinkContext);
  const decoder = useMemo(() => getHeadDecoder(fixtureTemplate, fixture.modeId), [fixtureTemplate, fixture.modeId]);
  const lensRefs = useRef<(HeadLensTarget | null)[]>([]);
  const lightRefs = useRef<(HeadLightTarget | null)[]>([]);
  // What the props say, for `restore`. Updated before the player's cleanup (a passive effect) can read it.
  const latestStates = useRef(states);
  useLayoutEffect(() => {
    latestStates.current = states;
  });
  // A selected fixture in the editor shows white, and explicit headStates win: neither follows the DMX.
  const followsDmx = !headStates && !(isSelected && !viewOnly);
  useEffect(() => {
    if (!registry || !decoder || !followsDmx) return;
    return registry.register(fixture.id, {
      decoder,
      colours: decoder.createOutput(),
      lenses: lensRefs.current,
      lights: lightRefs.current,
      restore: () =>
        latestStates.current.forEach((state, i) =>
          writeHead(lensRefs.current[i], lightRefs.current[i], restoreColour.set(state.colour), state.intensity),
        ),
    });
  }, [registry, decoder, followsDmx, fixture.id]);

  return (
    <mesh
      // Called with the mesh on mount and with null on unmount.
      ref={(mesh) => onMeshChange?.(fixture.id, mesh)}
      castShadow
      receiveShadow
      position={getFixture3DPosition(fixture)}
      rotation={getFixture3DRotation(fixture)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(fixture.id, event.shiftKey || event.ctrlKey || event.metaKey);
      }}
    >
      {body.shape === "cylinder" ? (
        <cylinderGeometry args={[body.radius, body.radius, body.height, 32]} />
      ) : (
        <boxGeometry args={body.size} />
      )}
      <meshStandardMaterial color="#3a3a3a" />

      {isSelected && (
        // Only the enlarged shell's back faces show around the solid fixture.
        <mesh raycast={() => {}}>
          {body.shape === "cylinder" ? (
            <cylinderGeometry args={[body.radius + OUTLINE, body.radius + OUTLINE, body.height + OUTLINE * 2, 32]} />
          ) : (
            <boxGeometry args={[body.size[0] + OUTLINE * 2, body.size[1] + OUTLINE * 2, body.size[2] + OUTLINE * 2]} />
          )}
          <meshBasicMaterial color={theme.colors.lime[4]} side={THREE.BackSide} toneMapped={false} fog={false} />
        </mesh>
      )}

      <FixtureLenses
        heads={heads}
        states={states}
        round={body.shape === "cylinder"}
        lensRef={(i, lens) => {
          lensRefs.current[i] = lens;
        }}
      />

      <HeadLights
        heads={heads}
        states={states}
        beamAngle={beamAngle}
        brightness={brightness}
        castShadow={castShadow}
        lightRef={(i, light) => {
          lightRefs.current[i] = light;
        }}
      />
    </mesh>
  );
};

/**
 * The visible lenses: each glows in its head's colour, so pixels read even without haze or lights.
 * Nothing is mounted per head: lenses are instances of the canvas's two lens meshes (see LensInstances.ts).
 */
const FixtureLenses = ({
  heads,
  states,
  round,
  lensRef,
}: {
  heads: HeadLayout[];
  states: HeadState[];
  round: boolean;
  /** Called with each head's lens (by head position), and null on unmount. */
  lensRef: (headIndex: number, lens: HeadLensTarget | null) => void;
}) => {
  const instances = useContext(LensInstancesContext);
  const invalidate = useThree((state) => state.invalidate);
  // The fixture's mesh: the lenses sit at the heads' positions in its space.
  const anchor = useRef<THREE.Object3D>(null);

  const lenses = useMemo(() => heads.map((head) => createLens(head.position, head.size, round)), [heads, round]);

  useEffect(() => {
    if (!instances) return;
    lenses.forEach((lens, i) => {
      lens.parent = anchor.current;
      instances.add(lens);
      lensRef(i, lens);
    });
    invalidate();
    return () => {
      lenses.forEach((lens, i) => {
        instances.remove(lens);
        lensRef(i, null);
      });
      invalidate();
    };
    // lensRef is a new function every render; it only stores the lens.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [lenses, instances, invalidate]);

  // The props' static state. Only written when it changes, so it doesn't undo the effect player.
  const statesKey = states.map((state) => `${state.colour}${state.intensity}`).join();
  useEffect(() => {
    lenses.forEach((lens, i) => {
      lens.color.copy(LENS_OFF_COLOUR).lerp(lensColour.set(states[i].colour), states[i].intensity / 100);
    });
    invalidate();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [lenses, statesKey, invalidate]);

  return <object3D ref={anchor} />;
};

/**
 * The lights that come out of the heads.
 *
 * This is the one place to change when moving to the "light table" renderer (every head written into one buffer and
 * lit by a custom floor/object shader). Everything else in this file stays.
 *
 * For now:
 * - 1 head: a spotlight (can cast a shadow, if StagePreview3D gave this fixture one of the few shadow slots).
 * - 2+ heads: a panel light (rectAreaLight) per head. No shadows, and no per-light texture, so they don't hit
 *   WebGPU's texture limit; they still cost per pixel × light.
 *   Temporarily: one CombinedPanelLight for the whole fixture instead (see below).
 */
const HeadLights = ({
  heads,
  states,
  beamAngle,
  brightness,
  castShadow,
  lightRef,
}: {
  heads: HeadLayout[];
  states: HeadState[];
  beamAngle: number;
  /** Multiplier on every light's output (the template's brightnessModifier / 100). */
  brightness: number;
  castShadow: boolean;
  /** Called with each head's light (by head position), and null on unmount. */
  lightRef: (headIndex: number, light: HeadLightTarget | null) => void;
}) => {
  // With a light table (the default), heads are table entries, not three.js lights.
  const table = useLightTable();
  if (table) {
    return (
      <TableHeadLights
        table={table}
        heads={heads}
        states={states}
        beamAngle={beamAngle}
        brightness={brightness}
        castShadow={castShadow}
        lightRef={lightRef}
      />
    );
  }

  // three.js lights have no scale of their own: scale the props, and hand the effect player a wrapper that scales
  // what it writes, so both paths match the table's.
  const scaledStates = brightness === 1 ? states : states.map((s) => ({ ...s, intensity: s.intensity * brightness }));
  const scaledRef = (i: number, light: HeadLightTarget | null) =>
    lightRef(i, light && brightness !== 1 ? scaleLightTarget(light, brightness) : light);

  if (heads.length === 1) {
    return (
      <SpotHeadLight
        head={heads[0]}
        state={scaledStates[0]}
        beamAngle={beamAngle}
        castShadow={castShadow}
        lightRef={(light) => scaledRef(0, light)}
      />
    );
  }
  return (
    // Temporarily change to use ONE RectAreaLight for ALL heads, to save on GPU costs.
    // <CombinedPanelLight heads={heads} states={states} />
    <>
      {heads.map((head, i) => (
        // An off head adds nothing; skip it instead of paying for it in every pixel.
        <PanelHeadLight
          key={head.index}
          head={head}
          state={scaledStates[i]}
          lightRef={(light) => scaledRef(i, light)}
        />
      ))}
    </>
  );
};

/** A light target whose `intensity` writes are multiplied by `scale` (for three.js lights, which have no scale). */
const scaleLightTarget = (light: HeadLightTarget, scale: number): HeadLightTarget => ({
  color: light.color,
  get intensity() {
    return scale === 0 ? 0 : light.intensity / scale;
  },
  set intensity(value: number) {
    light.intensity = value * scale;
  },
});

/** How much brighter than its lens area an LED head's cone is. 1 = the same on-axis brightness as its old panel light. */
const LED_HEAD_GAIN = 1;

/**
 * Every head is one entry of the canvas's light table: a cone along local +Y.
 * A single head is a spot, as before. A head of a multi-head fixture replaces its panel light with a cone of the same
 * on-axis brightness (intensity × lens area), so each pixel keeps its own colour on the floor and in the haze.
 * Nothing is mounted per head: turning heads on or off, or adding fixtures, only changes table data.
 */
const TableHeadLights = ({
  table,
  heads,
  states,
  beamAngle,
  brightness,
  castShadow,
  lightRef,
}: {
  table: LightTable;
  heads: HeadLayout[];
  states: HeadState[];
  beamAngle: number;
  brightness: number;
  castShadow: boolean;
  lightRef: (headIndex: number, light: HeadLightTarget | null) => void;
}) => {
  const invalidate = useThree((state) => state.invalidate);
  // The fixture's mesh: the lights sit at the heads' positions in its space.
  const anchor = useRef<THREE.Object3D>(null);

  const lights = useMemo(
    () =>
      heads.map((head) =>
        createTableLight({
          localPosition: new THREE.Vector3(...head.position),
          angle: THREE.MathUtils.degToRad(beamAngle / 2),
          // Only single-head fixtures cast shadows, as before.
          castShadow: castShadow && heads.length === 1,
          // The table multiplies this into every intensity write (props and effect player alike).
          intensityScale: (heads.length === 1 ? 1 : head.size[0] * head.size[1] * LED_HEAD_GAIN) * brightness,
        }),
      ),
    [heads, beamAngle, castShadow, brightness],
  );

  useEffect(() => {
    lights.forEach((light, i) => {
      light.parent = anchor.current;
      table.add(light);
      lightRef(i, light);
    });
    invalidate();
    return () => {
      lights.forEach((light, i) => {
        table.remove(light);
        lightRef(i, null);
      });
      invalidate();
    };
    // lightRef is a new function every render; it only stores the light.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [lights, table, invalidate]);

  // The props' static state. Like R3F props, only written when it changes, so it doesn't undo the effect player.
  const statesKey = states.map((state) => `${state.colour}${state.intensity}`).join();
  useEffect(() => {
    lights.forEach((light, i) => {
      light.color.set(states[i].colour);
      light.intensity = states[i].intensity;
    });
    invalidate();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [lights, statesKey, invalidate]);

  return <object3D ref={anchor} />;
};

const SpotHeadLight = ({
  head,
  state,
  beamAngle,
  castShadow,
  lightRef,
}: {
  head: HeadLayout;
  state: HeadState;
  beamAngle: number;
  castShadow: boolean;
  lightRef: (light: HeadLightTarget | null) => void;
}) => {
  const target = useMemo(() => new THREE.Object3D(), []);
  return (
    <>
      <spotLight
        ref={lightRef}
        layers-mask={VOLUMETRIC_LIGHT_MASK}
        // Include solid objects when shadows are rendered from the haze layer.
        shadow-camera-layers-mask={VOLUMETRIC_LIGHT_MASK}
        distance={20}
        position={head.position}
        target={target}
        intensity={state.intensity}
        angle={THREE.MathUtils.degToRad(beamAngle / 2)}
        penumbra={0.5}
        castShadow={castShadow}
        color={state.colour}
      />
      <primitive object={target} position={[head.position[0], head.position[1] + 1, head.position[2]]} />
    </>
  );
};

const PanelHeadLight = ({
  head,
  state,
  lightRef,
}: {
  head: HeadLayout;
  state: HeadState;
  lightRef: (light: HeadLightTarget | null) => void;
}) => (
  <rectAreaLight
    ref={lightRef}
    layers-mask={VOLUMETRIC_LIGHT_MASK}
    position={[head.position[0], head.position[1] + 0.001, head.position[2]]}
    // RectAreaLight emits along its local -Z; +90° around X turns that to +Y. Its height then runs along local Z.
    rotation={[Math.PI / 2, 0, 0]}
    width={head.size[0]}
    height={head.size[1]}
    intensity={state.intensity}
    color={state.colour}
  />
);

/**
 * TEMPORARY: one panel light for all of a multi-head fixture's heads, instead of one PanelHeadLight per head
 * (4 bars × 8 heads = 32 area lights → 4). The lenses still show each head's own colour; only the light thrown onto
 * the floor/objects/haze is blended.
 *
 * - Spans the heads' bounding box, so its total output matches the per-head panels (an area light's output is
 *   intensity × area): the average intensity over the whole span ≈ the heads' sum.
 * - Always mounted, even at intensity 0. Adding or removing lights changes every lit material's shader, which is
 *   what caused the lag spike the first time lights came on.
 */
// const CombinedPanelLight = ({ heads, states }: { heads: HeadLayout[]; states: HeadState[] }) => {
  // // Bounding box of the lenses on the top face (local X and Z). Only changes with the layout.
  // const { position, size } = useMemo(() => {
    // let minX = Infinity;
    // let maxX = -Infinity;
    // let minZ = Infinity;
    // let maxZ = -Infinity;
    // for (const head of heads) {
      // minX = Math.min(minX, head.position[0] - head.size[0] / 2);
      // maxX = Math.max(maxX, head.position[0] + head.size[0] / 2);
      // minZ = Math.min(minZ, head.position[2] - head.size[1] / 2);
      // maxZ = Math.max(maxZ, head.position[2] + head.size[1] / 2);
    // }
    // return {
      // position: [(minX + maxX) / 2, heads[0].position[1] + 0.001, (minZ + maxZ) / 2] as [number, number, number],
      // size: [maxX - minX, maxZ - minZ] as [number, number],
    // };
  // }, [heads]);

  // const state = averageHeadStates(states);

  // return (
    // <rectAreaLight
      // layers-mask={VOLUMETRIC_LIGHT_MASK}
      // position={position}
      // // Same orientation as PanelHeadLight: local -Z turned to +Y, height runs along local Z.
      // rotation={[Math.PI / 2, 0, 0]}
      // width={size[0]}
      // height={size[1]}
      // intensity={state.intensity}
      // color={state.colour}
    // />
  // );
// };

/**
 * The light all heads give together, as one HeadState: each head's colour × its intensity, averaged, then split back
 * into a full-brightness colour + intensity (like the decoder's toHeadState).
 * Done in linear colour (THREE.Color converts the hex), so red + blue heads average to a half-bright purple.
 */
// const averageHeadStates = (states: HeadState[]): HeadState => {
  // const sum = new THREE.Color(0, 0, 0);
  // for (const s of states) sum.add(new THREE.Color(s.colour).multiplyScalar(s.intensity / 100));
  // sum.multiplyScalar(1 / states.length);

  // const peak = Math.max(sum.r, sum.g, sum.b);
  // if (peak <= 0) return OFF;
  // return { colour: "#" + sum.multiplyScalar(1 / peak).getHexString(), intensity: peak * 100 };
// };
