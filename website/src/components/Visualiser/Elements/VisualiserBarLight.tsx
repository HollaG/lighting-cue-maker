import React, { useRef, useEffect } from "react";
import { Arc, Group, Rect, Transformer } from "react-konva";
import type { Group as GroupType } from "konva/lib/Group";
import type { Transformer as TransformerType } from "konva/lib/shapes/Transformer";
import type { Fixture, UpdateFixtureIn2DReq } from "../../../types/fixtures";
import {
  fixtureRepresentationTo2DShapeProps,
  hexToRgba,
  shapePropsToFixtureRepresentation,
} from "../../../utils/visualiser";
import type { PresetColourOption, PresetIntensityOption } from "../../../types/types";
import { VisualiserSelectedIndicator } from "./VisualiserSelectedIndicator";
import type { KonvaEventObject, Node, NodeConfig } from "konva/lib/Node";

/**
 * Representation of a Fixture in 2D view.
 *
 * @param param0
 * @returns
 */
export const VisualiserBarLightObject = React.memo(
  ({
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
    onSelect: (id: string) => void;
    onChange: (newProps: UpdateFixtureIn2DReq) => void;
    viewOnly?: boolean;

    intensityAttribute?: PresetIntensityOption;
    colourAttribute?: PresetColourOption;
  }) => {
    const shapeRef = useRef<GroupType | null>(null);
    const trRef = useRef<TransformerType | null>(null);

    const shapeProps = fixtureRepresentationTo2DShapeProps(fixture);

    useEffect(() => {
      if (!shapeRef.current || !trRef.current || !isSelected || viewOnly) return;
      trRef.current.nodes([shapeRef.current]);
    }, [isSelected, viewOnly]);

    const beamAngle = fixture.beamAngle === 0 ? 45 : fixture.beamAngle;

    const handleMouseOver = (e: KonvaEventObject<MouseEvent, Node<NodeConfig>>) => {
      const stage = e.target.getStage();
      if (!stage) return;

      stage.container().style.cursor = viewOnly ? "pointer" : "grab";
    };

    const handleMouseOut = (e: KonvaEventObject<MouseEvent, Node<NodeConfig>>) => {
      const stage = e.target.getStage();
      if (!stage) return;

      stage.container().style.cursor = "default";
    };

    const onDragStart = (e: KonvaEventObject<MouseEvent, Node<NodeConfig>>) => {
      const stage = e.target.getStage();
      if (!stage) return;

      stage.container().style.cursor = "grabbing";
    };

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
          x={shapeProps.x ?? 0}
          y={shapeProps.y ?? 0}
          // Keep posX/posY as the fixture's top-left position, like the other stage elements.
          // Moving the offset to the lamp centre only changes its rotation pivot.

          onClick={() => onSelect(fixture.id)}
          onTap={() => onSelect(fixture.id)}
          ref={shapeRef}
          draggable={!viewOnly}
          onDragStart={onDragStart}
          onDragEnd={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = "grab";

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
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
        >
          <Rect x={0} y={0} width={135} height={15} stroke={"#ffffff"} strokeWidth={2} fill={fillColour} />
          <Arc
            innerRadius={25}
            outerRadius={35}

            // The angle of the arc is determined by the fixture's beam angle.
            // Note that this is not the rotation of the fixture.
            angle={beamAngle}
            stroke={"#ffffff"}

            fill={fillColour}

            rotation={-beamAngle / 2 - 90}

            x={135 / 2}
            y={0}
          />

          {/* The Selected indicator */}
          {isSelected && <VisualiserSelectedIndicator x={135 / 2 + 5} y={15 / 2 + 5} />}
        </Group>
        {isSelected && !viewOnly && <Transformer ref={trRef} resizeEnabled={false} rotateEnabled />}
      </React.Fragment>
    );
  },
);
