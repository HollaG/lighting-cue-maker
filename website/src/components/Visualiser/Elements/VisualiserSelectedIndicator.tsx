import { Circle } from "react-konva";

export const VisualiserSelectedIndicator = ({ x, y }: { x: number; y: number }) => {
  return <Circle x={x} y={y} radius={10} stroke={"#000000"} strokeWidth={1} fill={"#a9e34b"} />;
};
