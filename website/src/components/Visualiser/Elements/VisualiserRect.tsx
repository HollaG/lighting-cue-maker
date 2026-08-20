import type { RectConfig } from "konva/lib/shapes/Rect";
import React, { useRef, useEffect } from "react";
import { Rect, Transformer } from "react-konva";
import type { Transformer as TransformerType } from "konva/lib/shapes/Transformer";
import type { Rect as RectType } from "konva/lib/shapes/Rect";

export const VisualiserRectangleObject = React.memo(
  ({
    id,
    shapeProps,
    isSelected,
    onSelect,
    onChange,
    viewOnly = false,
  }: {
    id: string;
    shapeProps: RectConfig;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onChange: (id: string, newProps: RectConfig) => void;
    viewOnly?: boolean;
  }) => {
    const shapeRef = useRef<RectType | null>(null);
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
        <Rect
          onClick={() => onSelect(id)}
          onTap={() => onSelect(id)}
          ref={shapeRef}
          {...shapeProps}
          listening={!viewOnly}
          draggable={!viewOnly}

          onDragEnd={(e) => {
            onChange(id, {
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
            const scaleY = node.scaleY();

            // we will reset it back
            node.scaleX(1);
            node.scaleY(1);
            onChange(id, {
              ...shapeProps,
              x: node.x(),
              y: node.y(),
              // set minimal value
              width: Math.max(5, node.width() * scaleX),
              height: Math.max(node.height() * scaleY),
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
            keepRatio={false}
          />
        )}
      </React.Fragment>
    );
  },
);
