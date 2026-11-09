import CheckerTexture from "../../../assets/checker.png";
import { useEffect } from "react";
import * as THREE from "three";
import { CameraControls, useTexture } from "@react-three/drei";
import type { Visualiser3DEnvironment, Visualiser3DObject } from "../../../types/visualiser3d";
import { Visualiser3DParLight } from "../Elements/Visualiser3DParLight";
import type { Fixture, PositionOption, UpdateFixtureIn3DReq } from "../../../types/fixtures";
import { Visualiser3DBarLight } from "../Elements/Visualiser3DBarLight";
import { Visualiser3DMovingLight } from "../Elements/Visualiser3DMovingLight";
import { useDebouncedCallback } from "@mantine/hooks";
import { useUpsertFixture } from "../../../query/fixtures/useUpsertFixtures";
import { Visualiser3DCuboid } from "../Elements/Visualiser3DCuboid";
import { Visualiser3DDefaultHuman } from "../Elements/Visualiser3DDefaultHuman";
import { GRID_SIZE, PLANE_SIZE } from "../../../utils/visualiser";
import type { GUI } from "lil-gui";
import { Visualiser3DVolumetrics } from "../Visualiser3DVolumetrics";
import { AttributeTypes, type ColourOption, type PresetIntensityOption } from "../../../types/types";
import type { PatchedFixture, UpsertPatchedFixture } from "../../../types-v2/patchedFixture";
import type { FixtureTemplate } from "../../../types-v2/fixtureTemplates";
import { useUpsertPatchedFixtures } from "../../../query-v2/patched-fixtures/useUpsertPatchedFixtures";
import { Logger } from "../../../utils/logger";

const logger = new Logger("StagePreview3D");

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

  /** Only provided when ViewOnly is false. Both are never provided together. */
  onObjectSelect?: (objectId: string) => void;
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

  const pars = fixtures.filter((fixture) => {
    const template = fixtureTemplates.find((t) => t.id === fixture.fixtureTemplateId);
    return template && template?.type === "par";
  });

  const bar_pixels = fixtures.filter((fixture) => {
    const template = fixtureTemplates.find((t) => t.id === fixture.fixtureTemplateId);
    return template?.type === "bar_pixel";
  });

  const onChange = useDebouncedCallback((newFixtureProps: UpsertPatchedFixture) => {
    upsertFixtureIn3D([newFixtureProps]);
  }, 100);

  logger.info(pars);
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

      {pars.map((fixture) => (
        <Visualiser3DParLight
          key={fixture.id}
          fixture={fixture}
          fixtureTemplate={fixtureTemplates.find((t) => t.id === fixture.fixtureTemplateId)!}
          isSelected={!!selectedObjectIds?.includes(fixture.id)}
          onSelect={onObjectSelect ? () => onObjectSelect(fixture.id) : () => {}}
          onChange={isViewOnly ? () => {} : onChange}
          gui={gui}
          viewOnly={isViewOnly}
        />
      ))}

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
