type BeamArcProps = {
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
  angle: number;
  rotation: number;
  fill: string;
};

function polarPoint(centerX: number, centerY: number, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  };
}

/** Builds the same ring segment that the visualiser draws with a Konva Arc. */
export function BeamArc({
  centerX,
  centerY,
  innerRadius,
  outerRadius,
  angle,
  rotation,
  fill,
}: BeamArcProps) {
  const outerStart = polarPoint(centerX, centerY, outerRadius, rotation);
  const outerEnd = polarPoint(centerX, centerY, outerRadius, rotation + angle);
  const innerEnd = polarPoint(centerX, centerY, innerRadius, rotation + angle);
  const innerStart = polarPoint(centerX, centerY, innerRadius, rotation);
  const largeArcFlag = angle > 180 ? 1 : 0;

  const path = [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");

  return <path d={path} fill={fill} />;
}
