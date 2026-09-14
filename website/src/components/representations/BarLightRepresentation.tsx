import type { ComponentPropsWithoutRef } from "react";
import { BeamArc } from "./BeamArc";

type BarLightRepresentationProps = ComponentPropsWithoutRef<"svg"> & {
  beamAngle?: number;
  fillColor?: string;
};

export function BarLightRepresentation({
  beamAngle = 45,
  fillColor = "transparent",
  color = "currentColor",
  width = 135,
  height = 51,
  ...props
}: BarLightRepresentationProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-2 -37 139 54"
      width={width}
      height={height}
      color={color}
      fill="none"
      stroke="currentColor"
      role="img"
      aria-label="Bar light"
      {...props}
    >
      <rect x="0" y="0" width="135" height="15" fill={fillColor} strokeWidth="2" />
      <BeamArc
        centerX={67.5}
        centerY={0}
        innerRadius={25}
        outerRadius={35}
        angle={beamAngle}
        rotation={-beamAngle / 2 - 90}
        fill={fillColor}
      />
    </svg>
  );
}
