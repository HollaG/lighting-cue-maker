import type { ComponentPropsWithoutRef } from "react";
import { BeamArc } from "./BeamArc";

type ParLightRepresentationProps = ComponentPropsWithoutRef<"svg"> & {
  beamAngle?: number;
  fillColor?: string;
};

export function ParLightRepresentation({
  beamAngle = 45,
  fillColor = "transparent",
  color = "currentColor",
  width = 90,
  height = 90,
  ...props
}: ParLightRepresentationProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-11 -11 92 92"
      width={width}
      height={height}
      color={color}
      fill="none"
      stroke="currentColor"
      role="img"
      aria-label="PAR light"
      {...props}
    >
      <circle cx="35" cy="35" r="25" fill={fillColor} strokeWidth="2" />
      <g transform="translate(35 35) rotate(45)" fill="currentColor" stroke="none">
        <rect x="-1" y="-25" width="2" height="50" />
        <rect x="-25" y="-1" width="50" height="2" />
      </g>
      <BeamArc
        centerX={35}
        centerY={35}
        innerRadius={35}
        outerRadius={45}
        angle={beamAngle}
        rotation={-beamAngle / 2 - 90}
        fill={fillColor}
      />
    </svg>
  );
}
