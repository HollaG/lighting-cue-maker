import React, { useEffect, useRef } from "react";
import type { Text as TextType, TextConfig } from "konva/lib/shapes/Text";
import type { Transformer as TransformerType } from "konva/lib/shapes/Transformer";
import { Text, Transformer } from "react-konva";

export const VisualiserTextObject = React.memo(({
  id,
  shapeProps,
  isSelected,
  onSelect,
  onChange,

  viewOnly = false,
}: {
  id: string;
  shapeProps: TextConfig;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, newProps: TextConfig) => void;

  viewOnly?: boolean;
}) => {
  const shapeRef = useRef<TextType | null>(null);
  const trRef = useRef<TransformerType | null>(null);

  useEffect(() => {
    if (!shapeRef.current || !trRef.current || viewOnly) return;
    if (isSelected) {
      trRef.current.nodes([shapeRef.current]);
    }
  }, [isSelected, viewOnly]);

  return (
    <React.Fragment>
      <Text
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
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          const scale = node.scaleX();
          const fontSize = Math.max(5, node.fontSize() * scale);

          // Persist the visual scale as font size instead of resizing the text box.
          node.scaleX(1);
          node.scaleY(1);

          onChange(id, {
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scale),
            rotation: node.rotation(),
            fontSize,
          });
        }}
      />
      {isSelected && !viewOnly && (
        <Transformer
          ref={trRef}
          flipEnabled={false}
          keepRatio
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
});
