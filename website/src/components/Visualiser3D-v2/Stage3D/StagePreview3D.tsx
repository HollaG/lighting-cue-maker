import CheckerTexture from "../../../assets/checker.png";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CameraControls, useTexture } from "@react-three/drei";
import type { Visualiser3DEnvironment, Visualiser3DObject } from "../../../types/visualiser3d";
import { Visualiser3DFixture } from "../Elements/Visualiser3DFixture";
import { getHeadCount } from "../../../utils/visualiser-v2-heads";
import type { Fixture, PositionOption, UpdateFixtureIn3DReq } from "../../../types/fixtures";
import { Visualiser3DBarLight } from "../Elements/Visualiser3DBarLight";
import { Visualiser3DMovingLight } from "../Elements/Visualiser3DMovingLight";
import { useUpsertFixture } from "../../../query/fixtures/useUpsertFixtures";
import { Visualiser3DCuboid } from "../Elements/Visualiser3DCuboid";
import { Visualiser3DDefaultHuman } from "../Elements/Visualiser3DDefaultHuman";
import { GRID_SIZE, PLANE_SIZE } from "../../../utils/visualiser";
import type { GUI } from "lil-gui";
import { Visualiser3DVolumetrics } from "../Visualiser3DVolumetrics";
import { AttributeTypes, type ColourOption, type PresetIntensityOption } from "../../../types/types";
import type { PatchedFixture } from "../../../types-v2/patchedFixture";
import type { FixtureTemplate } from "../../../types-v2/fixtureTemplates";
import { useUpsertPatchedFixtures } from "../../../query-v2/patched-fixtures/useUpsertPatchedFixtures";
import { Logger } from "../../../utils/logger";
import type { Placement } from "../../../utils/visualiser-v2-selection";
import { Visualiser3DSelectionTransform } from "../Elements/Visualiser3DSelectionTransform";

const logger = new Logger("StagePreview3D");

/**
 * At most this many lights cast shadows. Every shadow is a texture each lit material reads, and WebGPU's default limit
 * is 16 per shader (30 shadowed pars turned the scene black). Shadows are also the most expensive part per light.
 */
const MAX_SHADOW_CASTERS = 8;

export const StagePreview3D = ({
  eventId,

  environment,
  stageElements,
  cameraRef,
  selectedObjectIds,
  onObjectSelect,

  onCameraMove,
  onCameraRest,
  updateStageElement,
  gui,

  fixtures,
  fixtureTemplates,

  isViewOnly = false,
}: {
  eventId: string;

  environment: Visualiser3DEnvironment;
  stageElements: Visualiser3DObject[];
  selectedObjectIds?: string[];

  fixtureTemplates: FixtureTemplate[];

  cameraRef?: React.RefCallback<CameraControls | null>;
  onCameraMove?: () => void;
  onCameraRest?: () => void;

  /** Only provided when ViewOnly is false. `additive`: shift/ctrl/cmd-click adds to the selection. */
  onObjectSelect?: (objectId: string, additive?: boolean) => void;
  updateStageElement: (newElement: Visualiser3DObject) => void;
  gui: GUI | null;

  isViewOnly?: boolean;

  fixtures: PatchedFixture[];
}) => {
  const checkerTexture = useTexture(CheckerTexture);

  // const { mutateAsync: upsertVisualiser } = useUpsertVisualiser();
  const { mutateAsync: upsertFixtureIn3D } = useUpsertPatchedFixtures(eventId);

  useEffect(() => {
    checkerTexture.wrapS = THREE.RepeatWrapping;
    checkerTexture.wrapT = THREE.RepeatWrapping;
    checkerTexture.magFilter = THREE.NearestFilter;
    checkerTexture.colorSpace = THREE.SRGBColorSpace;
    checkerTexture.repeat.set(PLANE_SIZE / GRID_SIZE, PLANE_SIZE / GRID_SIZE);
    checkerTexture.needsUpdate = true;
  }, [checkerTexture]);

  const cuboids = stageElements.filter((element) => element.type === "cuboid");
  const humans = stageElements.filter((element) => element.type === "default_human");

  const templatesById = useMemo(() => new Map(fixtureTemplates.map((t) => [t.id, t])), [fixtureTemplates]);

  /**
   * Which fixtures get one of the few shadow slots: the first single-head fixtures (only spotlights cast shadows), in
   * fixture order. FIXED on purpose: it must not follow the selection.
   *
   * Turning castShadow off and back on for the same light at runtime (select A, then C, then A) left three's WebGPU
   * renderer reusing cached bindings that pointed at A's destroyed shadow map, and rendering never recovered.
   * Now the set only changes when fixtures are added or removed (which also recompiles shaders once).
   */
  const shadowCasterIds = useMemo(() => {
    if (isViewOnly) return new Set<string>();
    const ids = fixtures
      .filter((f) => getHeadCount(templatesById.get(f.fixtureTemplateId), f.modeId) === 1)
      .slice(0, MAX_SHADOW_CASTERS)
      .map((f) => f.id);
    return new Set(ids);
  }, [fixtures, templatesById, isViewOnly]);

  // Fixture meshes by id, so one gizmo can move the whole selection.
  const meshes = useRef(new Map<string, THREE.Object3D>());
  const onMeshChange = useCallback((fixtureId: string, mesh: THREE.Object3D | null) => {
    if (mesh) meshes.current.set(fixtureId, mesh);
    else meshes.current.delete(fixtureId);
  }, []);
  const getMesh = useCallback((fixtureId: string) => meshes.current.get(fixtureId), []);

  // Selected fixtures in selection order (a group's order when a group was picked).
  const selectedFixtures = (selectedObjectIds ?? [])
    .map((id) => fixtures.find((f) => f.id === id))
    .filter((f): f is PatchedFixture => !!f);

  /** One request for the whole selection. The backend replaces every field, so send the full fixture. */
  const onCommitPlacements = (placements: Placement[]) => {
    const updates = placements.flatMap((placement) => {
      const fixture = fixtures.find((f) => f.id === placement.id);
      if (!fixture) return [];
      const { createdAt: _c, updatedAt: _u, deletedAt: _d, eventId: _e, ...rest } = fixture;
      return [{ ...rest, ...placement }];
    });
    if (updates.length === 0) return;
    void upsertFixtureIn3D(updates).catch((error) => logger.error("Failed to save fixture placements", error));
  };

  return (
    <>
      <Visualiser3DVolumetrics fixtures={[]} environment={environment} />
      {/* The floor */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
        <meshStandardMaterial map={checkerTexture} side={THREE.DoubleSide} />
      </mesh>

      {/* Ambient light */}
      <ambientLight intensity={environment.ambientLight} />

      {/*  */}
      {/* <mesh castShadow receiveShadow position={[1.2, 1.2, 1.2]}>
        <boxGeometry args={[1.2, 1.75, 1.2]} />
        <meshStandardMaterial color="#8AC" />
      </mesh> */}

      {/* <mesh castShadow receiveShadow position={[-4, 5, 0]}>
        <sphereGeometry args={[3, 32, 16]} />
        <meshPhongMaterial color="#CA8" />
      </mesh> */}
      {/* 
      <spotLight castShadow position={[0, 8, 0]} intensity={150} penumbra={1} angle={Math.PI / 12}>
        <Helper type={THREE.SpotLightHelper} />
      </spotLight> */}

      {fixtures.map((fixture) => (
        <Visualiser3DFixture
          key={fixture.id}
          fixture={fixture}
          fixtureTemplate={templatesById.get(fixture.fixtureTemplateId)}
          isSelected={!!selectedObjectIds?.includes(fixture.id)}
          onSelect={(id, additive) => onObjectSelect?.(id, additive)}
          onMeshChange={onMeshChange}
          castShadow={shadowCasterIds.has(fixture.id)}
          viewOnly={isViewOnly}
        />
      ))}

      {!isViewOnly && (
        <Visualiser3DSelectionTransform
          fixtures={selectedFixtures}
          getMesh={getMesh}
          gui={gui}
          onCommit={onCommitPlacements}
        />
      )}

      {cuboids.map((cuboid) => (
        <Visualiser3DCuboid
          key={cuboid.id}
          cuboid={cuboid}
          isSelected={!!selectedObjectIds?.includes(cuboid.id)}
          onSelect={() => onObjectSelect && onObjectSelect(cuboid.id)}
          // onChange={onChange}
          onChange={isViewOnly ? () => {} : updateStageElement}
          gui={gui}

          // viewOnly={isViewOnly}
        />
      ))}

      {humans.map((human) => (
        <Visualiser3DDefaultHuman
          key={human.id}
          human={human}
          isSelected={!!selectedObjectIds?.includes(human.id)}
          onSelect={() => onObjectSelect && onObjectSelect(human.id)}
          onChange={isViewOnly ? () => {} : updateStageElement}
          gui={gui}

          // viewOnly={isViewOnly}
        />
      ))}

      <CameraControls
        ref={cameraRef}
        onControl={onCameraMove}
        onRest={onCameraRest}
        makeDefault
        dollyToCursor
        infinityDolly
        minDistance={0.01}
        maxDistance={Infinity}
      />

      {/* <OrbitControls makeDefault target={[0, 1, 0]} zoomToCursor minDistance={0.01} maxDistance={Infinity} /> */}
    </>
  );
};
