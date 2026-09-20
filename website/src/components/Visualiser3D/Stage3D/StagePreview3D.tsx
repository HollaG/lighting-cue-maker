import CheckerTexture from "../../../assets/checker.png";
import { useEffect } from "react";
import * as THREE from "three";
import { CameraControls, Helper, useTexture } from "@react-three/drei";
import type { Visualiser3DEnvironment, Visualiser3DObject } from "../../../types/visualiser3d";
import { Visualiser3DParLight } from "../Elements/Visualiser3DParLight";
import type { Fixture, UpdateFixtureIn3DReq } from "../../../types/fixtures";
import { Visualiser3DBarLight } from "../Elements/Visualiser3DBarLight";
import { Visualiser3DMovingLight } from "../Elements/Visualiser3DMovingLight";
import { useDebouncedCallback } from "@mantine/hooks";
import { useUpsertFixture } from "../../../query/useUpsertFixtures";
import { Visualiser3DCuboid } from "../Elements/Visualiser3DCuboid";
import { Visualiser3DDefaultHuman } from "../Elements/Visualiser3DDefaultHuman";
import { GRID_SIZE, PLANE_SIZE } from "../../../utils/visualiser";
import type { GUI } from "lil-gui";

export const StagePreview3D = ({
  environment,
  fixtures,
  stageElements,
  cameraRef,
  selectedElementId,
  onObjectSelect: onObjectSelect,
  // onFixtureChange,
  updateStageElement,
  gui,

  isStatic = false,
  onFixtureSelect,
}: {
  environment: Visualiser3DEnvironment;
  fixtures: Fixture[];
  stageElements: Visualiser3DObject[];
  selectedElementId?: string | null;

  cameraRef?: React.RefCallback<CameraControls | null>;

  /** Only provided when static is false. Both are never provided together. */
  onObjectSelect?: (objectId: string) => void;
  updateStageElement: (newElement: Visualiser3DObject) => void;
  gui: GUI | null;

  // For static only
  isStatic?: boolean;
  /** Only provided when static is true. Both are never provided together. */
  onFixtureSelect?: (_fixtureId: string, fixtureGroupId: string) => void;
}) => {
  const checkerTexture = useTexture(CheckerTexture);

  // const { mutateAsync: upsertVisualiser } = useUpsertVisualiser();
  const { mutateAsync: upsertFixtureIn3D } = useUpsertFixture();

  useEffect(() => {
    checkerTexture.wrapS = THREE.RepeatWrapping;
    checkerTexture.wrapT = THREE.RepeatWrapping;
    checkerTexture.magFilter = THREE.NearestFilter;
    checkerTexture.colorSpace = THREE.SRGBColorSpace;
    checkerTexture.repeat.set(PLANE_SIZE / GRID_SIZE, PLANE_SIZE / GRID_SIZE);
    checkerTexture.needsUpdate = true;
  }, [checkerTexture]);

  const pars = fixtures.filter((fixture) => fixture.type === "par");
  const bars = fixtures.filter((fixture) => fixture.type === "bar");
  const movingHeads = fixtures.filter((fixture) => fixture.type === "moving_head");
  const cuboids = stageElements.filter((element) => element.type === "cuboid");
  const humans = stageElements.filter((element) => element.type === "default_human");

  const onChange = useDebouncedCallback((newFixtureProps: UpdateFixtureIn3DReq) => {
    console.log("upserting fixture in 3D", newFixtureProps);
    upsertFixtureIn3D(newFixtureProps);
  }, 500);

  return (
    <>
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
          isSelected={selectedElementId === fixture.id}
          onSelect={
            onFixtureSelect
              ? () => onFixtureSelect(fixture.id, fixture.fixtureGroupId)
              : onObjectSelect
                ? () => onObjectSelect(fixture.id)
                : () => {}
          }
          onChange={isStatic ? () => {} : onChange}
          gui={gui}
        />
      ))}
      {bars.map((fixture) => (
        <Visualiser3DBarLight
          key={fixture.id}
          fixture={fixture}
          isSelected={selectedElementId === fixture.id}
          onSelect={
            onFixtureSelect
              ? () => onFixtureSelect(fixture.id, fixture.fixtureGroupId)
              : onObjectSelect
                ? () => onObjectSelect(fixture.id)
                : () => {}
          }
          onChange={isStatic ? () => {} : onChange}

          gui={gui}
        />
      ))}
      {movingHeads.map((fixture) => (
        <Visualiser3DMovingLight
          key={fixture.id}
          fixture={fixture}
          isSelected={selectedElementId === fixture.id}
          onSelect={
            onFixtureSelect
              ? () => onFixtureSelect(fixture.id, fixture.fixtureGroupId)
              : onObjectSelect
                ? () => onObjectSelect(fixture.id)
                : () => {}
          }

          onChange={isStatic ? () => {} : onChange}

          gui={gui}
        />
      ))}

      {cuboids.map((cuboid) => (
        <Visualiser3DCuboid
          key={cuboid.id}
          cuboid={cuboid}
          isSelected={selectedElementId === cuboid.id}
          onSelect={() => onObjectSelect && onObjectSelect(cuboid.id)}
          // onChange={onChange}
          onChange={isStatic ? () => {} : updateStageElement}
          gui={gui}
        />
      ))}

      {humans.map((human) => (
        <Visualiser3DDefaultHuman
          key={human.id}
          human={human}
          isSelected={selectedElementId === human.id}
          onSelect={() => onObjectSelect && onObjectSelect(human.id)}
          onChange={isStatic ? () => {} : updateStageElement}
          gui={gui}
        />
      ))}

      <CameraControls
        ref={cameraRef}
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
