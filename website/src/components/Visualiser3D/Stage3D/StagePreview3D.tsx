import CheckerTexture from "../../../assets/checker.png";
import { useEffect } from "react";
import * as THREE from "three";
import { CameraControls, Helper, TransformControls, useTexture } from "@react-three/drei";
import type { Visualiser3DEnvironment, Visualiser3DObject } from "../../../types/visualiser3d";
import { Visualiser3DParLight } from "../Elements/Visualiser3DParLight";
import type { Fixture, UpdateFixtureIn3DReq } from "../../../types/fixtures";
import { Visualiser3DBarLight } from "../Elements/Visualiser3DBarLight";
import { Visualiser3DMovingLight } from "../Elements/Visualiser3DMovingLight";
import { useDebouncedCallback } from "@mantine/hooks";
import { useUpsertFixture } from "../../../query/useUpsertFixtures";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { useLoader } from "@react-three/fiber";

import HumanModelUrl from "../../../assets/models/human.gltf?url";
import { Visualiser3DCuboid } from "../Elements/Visualiser3DCuboid";

const PLANE_SIZE = 20; // in meters
const squareSizeMetres = 0.6;

export const StagePreview3D = ({
  environment,
  fixtures,
  stageElements,
  cameraRef,
  selectedElementId,
  onElementSelect: onFixtureSelect,
  // onFixtureChange,
}: {
  environment: Visualiser3DEnvironment;
  fixtures: Fixture[];
  stageElements: Visualiser3DObject[];
  selectedElementId?: string | null;

  cameraRef?: React.RefCallback<CameraControls | null>;
  onElementSelect?: (fixtureId: string) => void;
  // onFixtureChange?: (fixtureId: string, newProps: unknown) => void;
}) => {
  const checkerTexture = useTexture(CheckerTexture);

  // const { mutateAsync: upsertVisualiser } = useUpsertVisualiser();
  const { mutateAsync: upsertFixtureIn3D } = useUpsertFixture();

  useEffect(() => {
    checkerTexture.wrapS = THREE.RepeatWrapping;
    checkerTexture.wrapT = THREE.RepeatWrapping;
    checkerTexture.magFilter = THREE.NearestFilter;
    checkerTexture.colorSpace = THREE.SRGBColorSpace;
    checkerTexture.repeat.set(PLANE_SIZE / squareSizeMetres, PLANE_SIZE / squareSizeMetres);
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

  // Load 3d models
  const gltfHuman = useLoader(GLTFLoader, HumanModelUrl);

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
      <mesh castShadow receiveShadow position={[1.2, 1.2, 1.2]}>
        <boxGeometry args={[1.2, 1.75, 1.2]} />
        <meshStandardMaterial color="#8AC" />
      </mesh>

      {/* <mesh castShadow receiveShadow position={[-4, 5, 0]}>
        <sphereGeometry args={[3, 32, 16]} />
        <meshPhongMaterial color="#CA8" />
      </mesh> */}

      <spotLight castShadow position={[0, 8, 0]} intensity={150} penumbra={1} angle={Math.PI / 12}>
        <Helper type={THREE.SpotLightHelper} />
      </spotLight>

      {/* Human test model */}

      {/* <TransformControls>
        <primitive object={gltfHuman.scene} position={[0, 0, 0]} scale={0.00314} castShadow></primitive>
      </TransformControls> */}
      {pars.map((fixture) => (
        <Visualiser3DParLight
          key={fixture.id}
          fixture={fixture}
          isSelected={selectedElementId === fixture.id}
          onSelect={() => onFixtureSelect && onFixtureSelect(fixture.id)}
          onChange={onChange}
        />
      ))}
      {bars.map((fixture) => (
        <Visualiser3DBarLight
          key={fixture.id}
          fixture={fixture}
          isSelected={selectedElementId === fixture.id}
          onSelect={() => onFixtureSelect && onFixtureSelect(fixture.id)}
          onChange={onChange}
        />
      ))}
      {movingHeads.map((fixture) => (
        <Visualiser3DMovingLight
          key={fixture.id}
          fixture={fixture}
          isSelected={selectedElementId === fixture.id}
          onSelect={() => onFixtureSelect && onFixtureSelect(fixture.id)}

          onChange={onChange}
        />
      ))}

      {cuboids.map((cuboid) => (
        <Visualiser3DCuboid
          key={cuboid.id}
          cuboid={cuboid}
          isSelected={selectedElementId === cuboid.id}
          onSelect={() => onFixtureSelect && onFixtureSelect(cuboid.id)}
          // onChange={onChange}
          onChange={(newProps) => {
            // console.log("upserting cuboid in 3D", newProps);
            // upsertFixtureIn3D({
            //   id: cuboid.id,
            //   type: "cuboid",
            //   props: newProps,
            // });
          }}
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
