"use client";

import { Shape } from "react-konva";
import type Konva from "konva";
import { PX_PER_METER } from "./constants";

const EXTENT_M = 60;

export default function GridBackground() {
  return (
    <Shape
      listening={false}
      sceneFunc={(ctx: Konva.Context, shape: Konva.Shape) => {
        const extentPx = EXTENT_M * PX_PER_METER;
        ctx.beginPath();
        for (let m = -EXTENT_M; m <= EXTENT_M; m += 1) {
          const isAxis = m === 0;
          const isMajor = m % 5 === 0;
          ctx.strokeStyle = isAxis ? "#525a66" : isMajor ? "#3a3f47" : "#2a2e34";
          ctx.lineWidth = isAxis ? 1.5 : isMajor ? 1 : 0.5;
          const p = m * PX_PER_METER;

          ctx.beginPath();
          ctx.moveTo(p, -extentPx);
          ctx.lineTo(p, extentPx);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(-extentPx, p);
          ctx.lineTo(extentPx, p);
          ctx.stroke();
        }
        ctx.fillStrokeShape(shape);
      }}
    />
  );
}
