"use client";

import { useRef } from "react";
import { Arc, Group, Line } from "react-konva";
import type Konva from "konva";
import type { Opening, Wall } from "@/lib/types";
import { distanceToSegment, pointOnWall, wallAngle, wallLength } from "@/lib/geometry";
import { PX_PER_METER } from "./constants";

interface OpeningShapeProps {
  opening: Opening;
  wall: Wall;
  selected: boolean;
  interactive: boolean;
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
  const lastOffset = useRef(clampedOffset);

  function dragBoundFunc(pos: Point2) {
    const world = { x: pos.x / PX_PER_METER, y: pos.y / PX_PER_METER };
    const { closest, t } = distanceToSegment(world, wall.a, wall.b);
    const rawOffset = t * len;
    const clamped = Math.min(Math.max(rawOffset, halfWidth), Math.max(len - halfWidth, halfWidth));
    const finalPoint = clamped === rawOffset ? closest : pointOnWall(wall, clamped).point;
    lastOffset.current = clamped;
    onOffsetLive(clamped);
    return { x: finalPoint.x * PX_PER_METER, y: finalPoint.y * PX_PER_METER };
  }

  return (
    <Group
      x={point.x * PX_PER_METER}
      y={point.y * PX_PER_METER}
      rotation={angleDeg}
      draggable={interactive}
      dragBoundFunc={interactive ? dragBoundFunc : undefined}
      onDragStart={onBeginTransaction}
      onDragEnd={() => {
        onOffsetEnd(lastOffset.current);
        onEndTransaction();
      }}
      onClick={(e: Konva.KonvaEventObject<MouseEvent>) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e: Konva.KonvaEventObject<Event>) => {
        e.cancelBubble = true;
        onSelect();
      }}
    >
      <Line
        points={[-opening.width * PX_PER_METER * 0.5, 0, opening.width * PX_PER_METER * 0.5, 0]}
        stroke={selected ? "#3b82f6" : color}
        strokeWidth={Math.max(wall.thickness * PX_PER_METER + 4, 10)}
        hitStrokeWidth={16}
      />
      {isDoor && (
        <Arc
          x={-opening.width * PX_PER_METER * 0.5}
          y={0}
          innerRadius={0}
          outerRadius={opening.width * PX_PER_METER}
          angle={90}
          rotation={0}
          stroke="#f59e0b"
          strokeWidth={1}
          listening={false}
        />
      )}
    </Group>
  );
}

type Point2 = { x: number; y: number };
