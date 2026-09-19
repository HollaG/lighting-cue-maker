import CheckerTexture from "../../../assets/checker.png";
import { useEffect } from "react";
import * as THREE from "three";
import { Helper, OrbitControls, useTexture } from "@react-three/drei";
import type { Visualiser3DEnvironment } from "../../../types/visualiser3d";
import { Visualiser3DParLight } from "../Elements/Visualiser3DParLight";
import type { Fixture } from "../../../types/fixtures";
import { Visualiser3DBarLight } from "../Elements/Visualiser3DBarLight";
import { Visualiser3DMovingLight } from "../Elements/Visualiser3DMovingLight";

const PLANE_SIZE = 20; // in meters
const squareSizeMetres = 0.6;

export const StagePreview3D = ({
  environment,
  fixtures,

  selectedElementId,
  onFixtureSelect,
  onFixtureChange,
}: {
  environment: Visualiser3DEnvironment;
  fixtures: Fixture[];
  selectedElementId?: string | null;

  onFixtureSelect?: (fixtureId: string) => void;
  onFixtureChange?: (fixtureId: string, newProps: unknown) => void;
}) => {
  const checkerTexture = useTexture(CheckerTexture);

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

  return (
    <>
      {/* The floor */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
        <meshPhongMaterial map={checkerTexture} side={THREE.DoubleSide} />
      </mesh>

      {/* Ambient light */}
      <ambientLight intensity={environment.ambientLight} />

      {/*  */}
      <mesh castShadow receiveShadow position={[1.2, 1.2, 1.2]}>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshPhongMaterial color="#8AC" />
      </mesh>

      {/* <mesh castShadow receiveShadow position={[-4, 5, 0]}>
        <sphereGeometry args={[3, 32, 16]} />
        <meshPhongMaterial color="#CA8" />
      </mesh> */}

      <spotLight castShadow position={[0, 8, 0]} intensity={150} penumbra={1} angle={Math.PI / 12}>
        <Helper type={THREE.SpotLightHelper} />
      </spotLight>

      {pars.map((fixture) => (
        <Visualiser3DParLight
          key={fixture.id}
          fixture={fixture}
          isSelected={selectedElementId === fixture.id}
          onSelect={() => onFixtureSelect && onFixtureSelect(fixture.id)}
          onChange={() => {}}
        />
      ))}
      {bars.map((fixture) => (
        <Visualiser3DBarLight
          key={fixture.id}
          fixture={fixture}
          isSelected={selectedElementId === fixture.id}
          onSelect={() => onFixtureSelect && onFixtureSelect(fixture.id)}
          onChange={() => {}}
        />
      ))}
      {movingHeads.map((fixture) => (
        <Visualiser3DMovingLight
          key={fixture.id}
          fixture={fixture}
          isSelected={selectedElementId === fixture.id}
          onSelect={() => onFixtureSelect && onFixtureSelect(fixture.id)}

          onChange={() => {}}
        />
      ))}

      <OrbitControls makeDefault target={[0, 1, 0]} minDistance={0.01} />
    </>
  );
};
