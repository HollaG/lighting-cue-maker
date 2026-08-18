import React, { useEffect, useRef } from "react";
import type { Text as TextType, TextConfig } from "konva/lib/shapes/Text";
import type { Transformer as TransformerType } from "konva/lib/shapes/Transformer";
import { Text, Transformer } from "react-konva";

export const VisualiserTextObject = ({
  shapeProps,
  isSelected,
  onSelect,
  onChange,
}: {
  shapeProps: TextConfig;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newProps: TextConfig) => void;
}) => {
  const shapeRef = useRef<TextType | null>(null);
  const trRef = useRef<TransformerType | null>(null);

  useEffect(() => {
    if (!shapeRef.current || !trRef.current) return;
    if (isSelected) {
      trRef.current.nodes([shapeRef.current]);
    }
  }, [isSelected]);

  return (
    <React.Fragment>
      <Text
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        {...shapeProps}
        draggable
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
          const scale = node.scaleX();
          const fontSize = Math.max(5, node.fontSize() * scale);

          // Persist the visual scale as font size instead of resizing the text box.
          node.scaleX(1);
          node.scaleY(1);

          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scale),
            rotation: node.rotation(),
            fontSize,
          });
        }}
      />
      {isSelected && (
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
};
