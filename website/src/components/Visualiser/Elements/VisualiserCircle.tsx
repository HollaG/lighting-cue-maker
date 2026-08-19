import React, { useRef, useEffect } from "react";
import { Circle, Transformer } from "react-konva";
import type { Transformer as TransformerType } from "konva/lib/shapes/Transformer";
import type { Circle as CircleType, CircleConfig } from "konva/lib/shapes/Circle";

export const VisualiserCircleObject = ({
  shapeProps,
  isSelected,
  onSelect,
  onChange,
  viewOnly = false,
}: {
  shapeProps: CircleConfig;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newProps: CircleConfig) => void;
  viewOnly?: boolean;
}) => {
  const shapeRef = useRef<CircleType | null>(null);
  const trRef = useRef<TransformerType | null>(null);

  useEffect(() => {
    if (!shapeRef.current || !trRef.current || viewOnly) return;
    if (isSelected) {
      // we need to attach transformer manually
      trRef?.current?.nodes([shapeRef.current]);
    }
  }, [isSelected, viewOnly]);

  return (
    <React.Fragment>
      <Circle
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
        onTransformEnd={(_) => {
          // transformer is changing scale of the node
          // and NOT its width or height
          // but in the store we have only width and height
          // to match the data better we will reset scale on transform end
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          // const scaleY = node.scaleY();

          // we will reset it back
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            // set minimal value
            radius: Math.max(5, node.radius() * scaleX),
          });
        }}
      />
      {isSelected && !viewOnly && (
        <Transformer
          ref={trRef}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            // limit resize
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
              return oldBox;
            }
            return newBox;
          }}
          // centeredScaling
          // keepRatio
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
        />
      )}
    </React.Fragment>
  );
};
