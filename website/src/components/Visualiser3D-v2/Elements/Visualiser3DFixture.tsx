import { useMemo } from "react";
import { useMantineTheme } from "@mantine/core";
import * as THREE from "three";
import type { PatchedFixture } from "../../../types-v2/patchedFixture";
import type { FixtureTemplate } from "../../../types-v2/fixtureTemplates";
import { getFixture3DPosition, getFixture3DRotation } from "../../../utils/visualiser-v2";
import { getBeamAngle, getFixtureBody, getHeadLayouts, type HeadLayout } from "../../../utils/visualiser-v2-heads";
import { VOLUMETRIC_LIGHT_MASK } from "../visualiser3DRenderer";
import { decodeHeadStates } from "../../../utils/visualiser-v2-decoder";

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

      {heads.map((head, i) => (
        <HeadLens key={head.index} head={head} state={states[i]} round={body.shape === "cylinder"} />
      ))}

      <HeadLights heads={heads} states={states} beamAngle={beamAngle} castShadow={castShadow} />
    </mesh>
  );
};

/** The visible lens: glows in the head's colour, so pixels read even without haze or lights. */
const HeadLens = ({ head, state, round }: { head: HeadLayout; state: HeadState; round: boolean }) => {
  const colour = useMemo(
    () => new THREE.Color("#111111").lerp(new THREE.Color(state.colour), state.intensity / 100),
    [state.colour, state.intensity],
  );
  return (
    <mesh
      position={[head.position[0], head.position[1] + 0.0005, head.position[2]]}
      // Planes and circles face +Z; turn them to face +Y (the beam direction).
      rotation={[-Math.PI / 2, 0, 0]}
      raycast={() => {}}
    >
      {round ? <circleGeometry args={[head.size[0] / 2, 32]} /> : <planeGeometry args={head.size} />}
      <meshBasicMaterial color={colour} toneMapped={false} />
    </mesh>
  );
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
  castShadow,
}: {
  heads: HeadLayout[];
  states: HeadState[];
  beamAngle: number;
  castShadow: boolean;
}) => {
  if (heads.length === 1) {
    return <SpotHeadLight head={heads[0]} state={states[0]} beamAngle={beamAngle} castShadow={castShadow} />;
  }
  return (
    // Temporarily change to use ONE RectAreaLight for ALL heads, to save on GPU costs.
    // <CombinedPanelLight heads={heads} states={states} />
    <>
      {heads.map((head, i) => (
        // An off head adds nothing; skip it instead of paying for it in every pixel.
        <PanelHeadLight key={head.index} head={head} state={states[i]} />
      ))}
    </>
  );
};

const SpotHeadLight = ({
  head,
  state,
  beamAngle,
  castShadow,
}: {
  head: HeadLayout;
  state: HeadState;
  beamAngle: number;
  castShadow: boolean;
}) => {
  const target = useMemo(() => new THREE.Object3D(), []);
  return (
    <>
      <spotLight
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

const PanelHeadLight = ({ head, state }: { head: HeadLayout; state: HeadState }) => (
  <rectAreaLight
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
