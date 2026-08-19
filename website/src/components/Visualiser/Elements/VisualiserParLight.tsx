import React, { useRef, useEffect } from "react";
import { Arc, Circle, Group, Rect, Transformer } from "react-konva";
import type { Group as GroupType } from "konva/lib/Group";
import type { Transformer as TransformerType } from "konva/lib/shapes/Transformer";
import type { Fixture, UpdateFixtureIn2DReq } from "../../../types/fixtures";
import {
  fixtureRepresentationTo2DShapeProps,
  hexToRgba,
  shapePropsToFixtureRepresentation,
} from "../../../utils/visualiser";
import type { AttributesAssignment, ValueAssignment } from "../../../types/cues";
import type { ColourOption, PresetColourOption, PresetIntensityOption } from "../../../types/types";

const LAMP_CENTER = 35;

/**
 * Representation of a Fixture in 2D view.
 *
 * ParLight can take in two attributes:
 *   intensity
 *   colour
 *
 * @param param0
 * @returns
 */
export const VisualiserParLightObject = ({
  fixture,
  isSelected,
  onSelect,
  onChange,
  viewOnly = false,

  intensityAttribute,
  colourAttribute,
}: {
  fixture: Fixture;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newProps: UpdateFixtureIn2DReq) => void;

  intensityAttribute?: PresetIntensityOption;
  colourAttribute?: PresetColourOption;

  viewOnly?: boolean;
}) => {
  const shapeRef = useRef<GroupType | null>(null);
  const trRef = useRef<TransformerType | null>(null);

  const shapeProps = fixtureRepresentationTo2DShapeProps(fixture);

  useEffect(() => {
    if (!shapeRef.current || !trRef.current || !isSelected || viewOnly) return;
    trRef.current.nodes([shapeRef.current]);
  }, [isSelected, viewOnly]);

  const beamAngle = fixture.beamAngle === 0 ? 45 : fixture.beamAngle;

  // Custom logic to draw
  // Intensity represents alpha: 0 is black (transparent), 1 is full colour (opaque)
  // Colour represents the colour of the light, in hex format.
  // If intensity not specified, default to 0
  // If colour not specified, default to black (#000000)
  const intensityAlpha = intensityAttribute ? intensityAttribute / 100 : 0;
  const colourHex = colourAttribute?.hex ?? "#000000";
  const fillColour = hexToRgba(colourHex, intensityAlpha);

  return (
    <React.Fragment>
      <Group
        {...shapeProps}
        x={(shapeProps.x ?? 0) + LAMP_CENTER}
        y={(shapeProps.y ?? 0) + LAMP_CENTER}
        // Keep posX/posY as the fixture's top-left position, like the other stage elements.
        // Moving the offset to the lamp centre only changes its rotation pivot.
        offsetX={LAMP_CENTER}
        offsetY={LAMP_CENTER}
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        listening={!viewOnly}
        draggable={!viewOnly}
        onDragEnd={(e) => {
          onChange({
            ...shapePropsToFixtureRepresentation(shapeProps, fixture),
            id: fixture.id,
            posX: e.target.x() - LAMP_CENTER,
            posY: e.target.y() - LAMP_CENTER,
            rotZ: e.target.rotation(),
          });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;

          onChange({
            // Get the other fields, especially the fixtureGroupid
            ...shapePropsToFixtureRepresentation(shapeProps, fixture),
            id: fixture.id,
            posX: node.x() - LAMP_CENTER,
            posY: node.y() - LAMP_CENTER,
            rotZ: node.rotation(),
          });
        }}
      >
        <Circle x={25 + 10} y={25 + 10} radius={25} stroke={"#ffffff"} strokeWidth={2} fill={fillColour} />
        {/* <Rect x={0 + 10} y={0 + 10} width={50} height={50} stroke={"#ffffff"} strokeWidth={2} /> */}

        {/* Make a full + inside the circle */}
        <Group x={35} y={35} rotation={45}>
          <Rect x={-1} y={-25} width={2} height={50} fill={"#ffffff"} />
          <Rect x={-25} y={-1} width={50} height={2} fill={"#ffffff"} />
        </Group>

        {/* The beam indicator.*/}
        <Arc
          innerRadius={35}
          outerRadius={45}

          // The angle of the arc is determined by the fixture's beam angle.
          // Note that this is not the rotation of the fixture.
          angle={beamAngle}
          stroke={"#ffffff"}

          rotation={-beamAngle / 2 - 90}
          fill={fillColour}
          x={35}
          y={35}
        />
      </Group>
      {isSelected && !viewOnly && <Transformer ref={trRef} resizeEnabled={false} rotateEnabled />}
    </React.Fragment>
  );
};
