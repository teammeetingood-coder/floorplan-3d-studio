"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { Opening, Point, Wall } from "@/lib/types";
import { distanceToSegment, pointOnWall, wallAngle, wallLength } from "@/lib/geometry";
import { PX_PER_METER } from "./constants";

interface OpeningShapeProps {
  opening: Opening;
  wall: Wall;
  selected: boolean;
  interactive: boolean;
  toWorld: (clientX: number, clientY: number) => Point;
  onSelect: () => void;
  onOffsetLive: (offset: number) => void;
  onOffsetEnd: (offset: number) => void;
  onBeginTransaction: () => void;
  onEndTransaction: () => void;
}

export default function OpeningShape({
  opening,
  wall,
  selected,
  interactive,
  toWorld,
  onSelect,
  onOffsetLive,
  onOffsetEnd,
  onBeginTransaction,
  onEndTransaction,
}: OpeningShapeProps) {
  const len = wallLength(wall);
  const halfWidth = opening.width / 2;
  const clampedOffset = Math.min(Math.max(opening.offset, halfWidth), Math.max(len - halfWidth, halfWidth));
  const { point } = pointOnWall(wall, clampedOffset);
  const angleDeg = (wallAngle(wall) * 180) / Math.PI;
  const isDoor = opening.type === "door";
  const color = isDoor ? "#f59e0b" : "#38bdf8";
  const widthPx = opening.width * PX_PER_METER;
  const strokeWidthPx = Math.max(wall.thickness * PX_PER_METER + 4, 10);

  function computeClampedOffset(clientX: number, clientY: number): number {
    const world = toWorld(clientX, clientY);
    const { t } = distanceToSegment(world, wall.a, wall.b);
    const rawOffset = t * len;
    return Math.min(Math.max(rawOffset, halfWidth), Math.max(len - halfWidth, halfWidth));
  }

  function handlePointerDown(e: ReactPointerEvent<SVGLineElement>) {
    e.stopPropagation();
    onSelect();
    if (!interactive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onBeginTransaction();
  }

  function handlePointerMove(e: ReactPointerEvent<SVGLineElement>) {
    if (!interactive) return;
    onOffsetLive(computeClampedOffset(e.clientX, e.clientY));
  }

  function handlePointerUp(e: ReactPointerEvent<SVGLineElement>) {
    if (!interactive) return;
    onOffsetEnd(computeClampedOffset(e.clientX, e.clientY));
    onEndTransaction();
  }

  return (
    <g transform={`translate(${point.x * PX_PER_METER} ${point.y * PX_PER_METER}) rotate(${angleDeg})`}>
      <line
        x1={-widthPx / 2}
        y1={0}
        x2={widthPx / 2}
        y2={0}
        stroke={selected ? "#3b82f6" : color}
        strokeWidth={strokeWidthPx}
        pointerEvents={interactive ? "stroke" : "none"}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ cursor: interactive ? "grab" : "default" }}
      />
      {isDoor && (
        <path
          d={`M ${-widthPx / 2} 0 A ${widthPx} ${widthPx} 0 0 1 ${-widthPx / 2 + widthPx} ${-widthPx}`}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={1}
          pointerEvents="none"
        />
      )}
    </g>
  );
}
