"use client";

import { PX_PER_METER } from "./constants";

const EXTENT_M = 60;

export default function GridBackground() {
  const lines = [];
  const extentPx = EXTENT_M * PX_PER_METER;

  for (let m = -EXTENT_M; m <= EXTENT_M; m += 1) {
    const isAxis = m === 0;
    const isMajor = m % 5 === 0;
    const color = isAxis ? "#525a66" : isMajor ? "#3a3f47" : "#2a2e34";
    const width = isAxis ? 1.5 : isMajor ? 1 : 0.5;
    const p = m * PX_PER_METER;

    lines.push(
      <line key={`v${m}`} x1={p} y1={-extentPx} x2={p} y2={extentPx} stroke={color} strokeWidth={width} />,
    );
    lines.push(
      <line key={`h${m}`} x1={-extentPx} y1={p} x2={extentPx} y2={p} stroke={color} strokeWidth={width} />,
    );
  }

  return <g pointerEvents="none">{lines}</g>;
}
