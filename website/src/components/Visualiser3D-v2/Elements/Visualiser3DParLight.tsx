import type { PresetColourOption, PresetIntensityOption } from "../../../types/types";
import { useMemo, useState } from "react";
import { useMantineTheme } from "@mantine/core";

import * as THREE from "three";
import { getFixture3DPosition, getFixture3DRotation } from "../../../utils/visualiser-v2";
import { VOLUMETRIC_LIGHT_MASK } from "../visualiser3DRenderer";
import type { PatchedFixture } from "../../../types-v2/patchedFixture";
import type { FixtureTemplate } from "../../../types-v2/fixtureTemplates";

export const Visualiser3DParLight = ({
  fixture,
  fixtureTemplate,
  isSelected,
  onSelect,
  onMeshChange,
  viewOnly = false,

  intensityAttribute: nextIntensityAttribute,
  colourAttribute: nextColourAttribute,

  transitionTime: nextTransitionTime = 0,
}: {
  fixture: PatchedFixture;
  fixtureTemplate: FixtureTemplate;

  isSelected: boolean;
  /** `additive`: shift/ctrl/cmd was held, so add to or remove from the selection instead of replacing it. */
  onSelect: (fixtureId: string, additive: boolean) => void;
  /** Registers the mesh so the selection gizmo can move it. Moving and saving live in Visualiser3DSelectionTransform. */
  onMeshChange?: (fixtureId: string, mesh: THREE.Mesh | null) => void;

  viewOnly?: boolean;

  intensityAttribute?: PresetIntensityOption;
  colourAttribute?: PresetColourOption;
  /** Specify the transition time to the next assignment, so we can animate it */
  transitionTime?: number;
}) => {
  const theme = useMantineTheme();

  // Transition logic
  const [transitionTime, setTransitionTime] = useState<number>(nextTransitionTime);
  const [intensityAttribute, setIntensityAttribute] = useState<PresetIntensityOption | undefined>(
    nextIntensityAttribute,
  );
  const [colourAttribute, setColourAttribute] = useState<PresetColourOption | undefined>(nextColourAttribute);

  // useEffect(() => {
  //   // if any of the attributes change, we need to start animating between them
  //   if (transitionTime === 0) {
  //     // if the current transition time is 0, just straightaway update
  //     setIntensityAttribute(nextIntensityAttribute);
  //     setColourAttribute(nextColourAttribute);
  //     setTransitionTime(nextTransitionTime);
  //   } else {
  //     // animate between the current and next attribute
  //     // const frameCount

  //     const startedAt = performance.now();
  //     const animate = () => {
  //       const now = performance.now();
  //       const elapsed = now - startedAt;
  //       // use the old transition time until we're done transitioning
  //       const t = Math.min(elapsed / transitionTime, 1);

  //       const newIntensity = lerp(
  //         "presetIntensity",
  //         { presetIntensity: intensityAttribute },
  //         { presetIntensity: nextIntensityAttribute },
  //         t,
  //         1,
  //       ).presetIntensity;

  //       const newColour = lerp(
  //         "presetColour",
  //         { presetColour: colourAttribute },
  //         { presetColour: nextColourAttribute },
  //         t,
  //         1,
  //       ).presetColour;

  //       setIntensityAttribute(newIntensity);
  //       setColourAttribute(newColour);

  //       if (t < 1) {
  //         requestAnimationFrame(animate);
  //       } else {
  //         // finished animating, set the final values
  //         setIntensityAttribute(nextIntensityAttribute);
  //         setColourAttribute(nextColourAttribute);
  //         setTransitionTime(nextTransitionTime);
  //       }
  //     };

  //     const animationFrame = requestAnimationFrame(animate);

  //     return () => {
  //       cancelAnimationFrame(animationFrame);
  //     };
  //   }
  // }, [nextIntensityAttribute, nextColourAttribute, nextTransitionTime]);

  // react state for beam angle so we can dynamically update it
  // const [beamAngle, setBeamAngle] = useState(fixture.beamAngle || 15);
  // ref for lil-gui: we can't directly modify beamAngle (we need another object, then we can call `onChange` and actually update the state)
  // const beamControls = useMemo(() => ({ angle: fixture.beamAngle || 15 }), []);

  const beamAngle =
    fixtureTemplate.properties.minBeamAngle === fixtureTemplate.properties.maxBeamAngle
      ? fixtureTemplate.properties.minBeamAngle
      : fixtureTemplate.properties.minBeamAngle || 15;
  const spotlightTarget = useMemo(() => new THREE.Object3D(), []);

  // Custom logic to draw
  // Intensity represents the literal intensity here. 0-100, don't need to map.
  // Colour represents the colour of the light, in hex format.
  const intensity = isSelected && !viewOnly ? 100 : intensityAttribute || 0;
  const colour = colourAttribute?.hex || "#ffffff";

  return (
    <>
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
        // onPointerDown={(event) => {
        //   console.log("onPointerDown fired for Par light");
        //   event.stopPropagation();
        //   onSelect(fixture.id);
        // }}
      >
        <cylinderGeometry args={[0.105, 0.105, 0.104, 32]} />
        <meshStandardMaterial color="#eeeeee" />

        {isSelected && (
          // Only the enlarged shell's back faces show around the solid fixture.
          <mesh raycast={() => {}}>
            <cylinderGeometry args={[0.109, 0.109, 0.112, 32]} />
            <meshBasicMaterial color={theme.colors.lime[4]} side={THREE.BackSide} toneMapped={false} fog={false} />
          </mesh>
        )}

        {/* <spotLight
          position={[0, -0.052, 0]}
          target={spotlightTarget}
          intensity={150}
          angle={THREE.MathUtils.degToRad(beamAngle / 2)}
          penumbra={0.5}
          distance={10}
          castShadow
        >
          {isSelected && <Helper type={THREE.SpotLightHelper} />}
        </spotLight> */}

        <spotLight
          layers-mask={VOLUMETRIC_LIGHT_MASK}
          // Include solid objects when shadows are rendered from the haze layer.
          shadow-camera-layers-mask={VOLUMETRIC_LIGHT_MASK}
          distance={20}
          position={[0, 0.052, 0]}
          target={spotlightTarget}
          intensity={intensity}
          angle={THREE.MathUtils.degToRad(beamAngle ? beamAngle / 2 : 15)}
          penumbra={0.5}
          castShadow={false}
          color={colour}
        />

        <primitive object={spotlightTarget} position={[0, 1, 0]} />

        {/* <spotLight castShadow position={[0, 8, 0]} intensity={150} penumbra={1} angle={Math.PI / 12}>
          <Helper type={THREE.SpotLightHelper} />
        </spotLight> */}
      </mesh>
    </>
  );
};
