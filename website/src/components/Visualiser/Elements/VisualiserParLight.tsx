import React, { useRef, useEffect } from "react";
import { Circle, Group, Rect, Transformer } from "react-konva";
import type { Group as GroupType, GroupConfig } from "konva/lib/Group";
import type { Fixture, UpdateFixtureIn2DReq } from "../../../types/fixtures";
import { fixtureRepresentationTo2DShapeProps, shapePropsToFixtureRepresentation } from "../../../utils/visualiser";

/**
 * Representation of a Fixture in 2D view.
 *
 * @param param0
 * @returns
 */
export const VisualiserParLightObject = ({
  fixture,
  onSelect,
  onChange,
}: {
  fixture: Fixture;
  onSelect: () => void;
  onChange: (newProps: UpdateFixtureIn2DReq) => void;
}) => {
  const shapeRef = useRef<GroupType | null>(null);

  const shapeProps = fixtureRepresentationTo2DShapeProps(fixture);

  return (
    <React.Fragment>
      <Group
        {...shapeProps}
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        draggable
        onDragEnd={(e) => {
          onChange({
            ...shapePropsToFixtureRepresentation(shapeProps, fixture),
            posX: e.target.x(),
            posY: e.target.y(),
          });
        }}
      >
        <Circle x={25 + 10} y={25 + 10} radius={25} stroke={"#ffffff"} strokeWidth={2} />
        <Rect x={0 + 10} y={0 + 10} width={50} height={50} stroke={"#ffffff"} strokeWidth={2} />
      </Group>
    </React.Fragment>
  );
};
