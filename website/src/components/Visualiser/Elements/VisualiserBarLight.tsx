import React, { useRef, useEffect } from "react";
import { Arc, Group, Rect, Transformer } from "react-konva";
import type { Group as GroupType } from "konva/lib/Group";
import type { Transformer as TransformerType } from "konva/lib/shapes/Transformer";
import type { Fixture, UpdateFixtureIn2DReq } from "../../../types/fixtures";
import { fixtureRepresentationTo2DShapeProps, shapePropsToFixtureRepresentation } from "../../../utils/visualiser";

/**
 * Representation of a Fixture in 2D view.
 *
 * @param param0
 * @returns
 */
export const VisualiserBarLightObject = ({
  fixture,
  isSelected,
  onSelect,
  onChange,
}: {
  fixture: Fixture;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newProps: UpdateFixtureIn2DReq) => void;
}) => {
  const shapeRef = useRef<GroupType | null>(null);
  const trRef = useRef<TransformerType | null>(null);

  const shapeProps = fixtureRepresentationTo2DShapeProps(fixture);

  useEffect(() => {
    if (!shapeRef.current || !trRef.current || !isSelected) return;
    trRef.current.nodes([shapeRef.current]);
  }, [isSelected]);

  const beamAngle = fixture.beamAngle === 0 ? 45 : fixture.beamAngle;
  console.log({ shapeProps });
  return (
    <React.Fragment>
      <Group
        {...shapeProps}
        x={shapeProps.x ?? 0}
        y={shapeProps.y ?? 0}
        // Keep posX/posY as the fixture's top-left position, like the other stage elements.
        // Moving the offset to the lamp centre only changes its rotation pivot.

        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        draggable
        onDragEnd={(e) => {
          onChange({
            ...shapePropsToFixtureRepresentation(shapeProps, fixture),
            id: fixture.id,
            posX: e.target.x(),
            posY: e.target.y(),
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
            posX: node.x(),
            posY: node.y(),
            rotZ: node.rotation(),
          });
        }}
      >
        <Rect x={0} y={0} width={135} height={15} stroke={"#ffffff"} strokeWidth={2} />

        <Arc
          innerRadius={25}
          outerRadius={35}

          // The angle of the arc is determined by the fixture's beam angle.
          // Note that this is not the rotation of the fixture.
          angle={beamAngle}
          stroke={"#ffffff"}

          rotation={-beamAngle / 2 - 90}

          x={135 / 2}
          y={0}
        />
      </Group>
      {isSelected && <Transformer ref={trRef} resizeEnabled={false} rotateEnabled />}
    </React.Fragment>
  );
};
