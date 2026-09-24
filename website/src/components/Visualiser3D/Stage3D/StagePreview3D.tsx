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
import { useUpsertFixture } from "../../../query/useUpsertFixtures";
import { Visualiser3DCuboid } from "../Elements/Visualiser3DCuboid";
import { Visualiser3DDefaultHuman } from "../Elements/Visualiser3DDefaultHuman";
import { GRID_SIZE, PLANE_SIZE } from "../../../utils/visualiser";
import type { GUI } from "lil-gui";
import { Visualiser3DVolumetrics } from "../Visualiser3DVolumetrics";
import { AttributeTypes, type ColourOption, type PresetIntensityOption } from "../../../types/types";

export const StagePreview3D = ({
  environment,
  fixtures,
  stageElements,
  cameraRef,
  selectedObjectIds,
  onObjectSelect,
  // onFixtureChange,
  updateStageElement,
  gui,

  isViewOnly = false,
  onFixtureSelect,
  getAttribute,
}: {
  environment: Visualiser3DEnvironment;
  fixtures: Fixture[];
  stageElements: Visualiser3DObject[];
  selectedObjectIds?: string[];

  cameraRef?: React.RefCallback<CameraControls | null>;

  /** Only provided when ViewOnly is false. Both are never provided together. */
  onObjectSelect?: (objectId: string) => void;
  updateStageElement: (newElement: Visualiser3DObject) => void;
  gui: GUI | null;

  // For view-only mode.
  isViewOnly?: boolean;
  /** Only provided when ViewOnly is true. Both are never provided together. */
  onFixtureSelect?: (_fixtureId: string, fixtureGroupId: string) => void;

  /** Get the attribute for a given fixture and attribute type. Note
   * Note that some attributes are `dynamic`, in that they will not be stored in the fixture itself, but rather in the visualiser state.
   * For example, the `position` attribute:
   *   in the config,
   */
  getAttribute?: (
    fixture: Fixture,
    attribute: AttributeTypes,
  ) => string | number | boolean | string[] | ColourOption | PositionOption | null | undefined;
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
  }, 100);

  return (
    <>
      <Visualiser3DVolumetrics fixtures={fixtures} environment={environment} />
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
          isSelected={!!selectedObjectIds?.includes(fixture.id)}
          onSelect={
            onFixtureSelect
              ? () => onFixtureSelect(fixture.id, fixture.fixtureGroupId)
              : onObjectSelect
                ? () => onObjectSelect(fixture.id)
                : () => {}
          }
          onChange={isViewOnly ? () => {} : onChange}
          gui={gui}

          viewOnly={isViewOnly}

          colourAttribute={getAttribute?.(fixture, AttributeTypes.PRESET_COLOUR) as ColourOption | undefined}
          intensityAttribute={
            getAttribute?.(fixture, AttributeTypes.PRESET_INTENSITY) as PresetIntensityOption | undefined
          }
        />
      ))}
      {bars.map((fixture) => (
        <Visualiser3DBarLight
          key={fixture.id}
          fixture={fixture}
          isSelected={!!selectedObjectIds?.includes(fixture.id)}
          onSelect={
            onFixtureSelect
              ? () => onFixtureSelect(fixture.id, fixture.fixtureGroupId)
              : onObjectSelect
                ? () => onObjectSelect(fixture.id)
                : () => {}
          }
          onChange={isViewOnly ? () => {} : onChange}

          gui={gui}

          viewOnly={isViewOnly}
          colourAttribute={getAttribute?.(fixture, AttributeTypes.PRESET_COLOUR) as ColourOption | undefined}
          intensityAttribute={
            getAttribute?.(fixture, AttributeTypes.PRESET_INTENSITY) as PresetIntensityOption | undefined
          }
        />
      ))}
      {movingHeads.map((fixture) => (
        <Visualiser3DMovingLight
          key={fixture.id}
          fixture={fixture}
          isSelected={!!selectedObjectIds?.includes(fixture.id)}
          onSelect={
            onFixtureSelect
              ? () => onFixtureSelect(fixture.id, fixture.fixtureGroupId)
              : onObjectSelect
                ? () => onObjectSelect(fixture.id)
                : () => {}
          }

          onChange={isViewOnly ? () => {} : onChange}

          gui={gui}

          viewOnly={isViewOnly}

          colourAttribute={getAttribute?.(fixture, AttributeTypes.PRESET_COLOUR) as ColourOption | undefined}
          intensityAttribute={
            getAttribute?.(fixture, AttributeTypes.PRESET_INTENSITY) as PresetIntensityOption | undefined
          }
          positionAttribute={getAttribute?.(fixture, AttributeTypes.PRESET_POSITION) as PositionOption | undefined}
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
