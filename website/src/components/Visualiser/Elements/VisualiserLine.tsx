import React, { useEffect, useRef } from "react";
import type { Line as LineType, LineConfig } from "konva/lib/shapes/Line";
import type { Transformer as TransformerType } from "konva/lib/shapes/Transformer";
import { Line, Transformer } from "react-konva";

export const VisualiserLineObject = ({
  shapeProps,
  isSelected,
  onSelect,
  onChange,
  viewOnly = false,
}: {
  shapeProps: LineConfig;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newProps: LineConfig) => void;
  viewOnly?: boolean;
}) => {
  const shapeRef = useRef<LineType | null>(null);
  const trRef = useRef<TransformerType | null>(null);

  useEffect(() => {
    if (!shapeRef.current || !trRef.current || viewOnly) return;
    if (isSelected) {
      trRef.current.nodes([shapeRef.current]);
    }
  }, [isSelected, viewOnly]);

  return (
    <React.Fragment>
      <Line
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        {...shapeProps}
        listening={!viewOnly}
        draggable={!viewOnly}
        onDragEnd={(e) => {
          onChange({
            ...shapeProps,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;

          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          const points = node.points().map((point, index) => point * (index % 2 === 0 ? scaleX : scaleY));

          // Store the resized points instead of leaving transient scale values.
          node.scaleX(1);
          node.scaleY(1);

          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            points,
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && !viewOnly && (
        <Transformer
          ref={trRef}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            // A horizontal or vertical line naturally has a near-zero dimension.
            if (Math.abs(newBox.width) < 5 && Math.abs(newBox.height) < 5) {
              return oldBox;
            }
            return newBox;
          }}
          enabledAnchors={["middle-left", "middle-right"]}
        />
      )}
    </React.Fragment>
  );
};
