"use client";

import { useRef } from "react";
import { Circle, Group, Line } from "react-konva";
import type Konva from "konva";
import type { Point, Wall } from "@/lib/types";
import { snapPoint, snapToNearestEndpoint } from "@/lib/geometry";
import { PX_PER_METER } from "./constants";

interface WallShapeProps {
  wall: Wall;
  allWalls: Wall[];
  selected: boolean;
  interactive: boolean;
  gridSize: number;
  onSelect: () => void;
  onMoveLive: (a: Point, b: Point) => void;
  onMoveEnd: (a: Point, b: Point) => void;
  onBeginTransaction: () => void;
  onEndTransaction: () => void;
}

export default function WallShape({
  wall,
  allWalls,
  selected,
  interactive,
  gridSize,
  onSelect,
  onMoveLive,
  onMoveEnd,
  onBeginTransaction,
  onEndTransaction,
}: WallShapeProps) {
  const dragOrigin = useRef<{ a: Point; b: Point } | null>(null);

  const isAuto = wall.source === "auto";
  const confidence = wall.confidence ?? 1;
  const strokeColor = selected
    ? "#3b82f6"
    : isAuto
      ? `rgba(245, 158, 11, ${0.4 + confidence * 0.6})`
      : "#e5e7eb";

  const points = [
    wall.a.x * PX_PER_METER,
    wall.a.y * PX_PER_METER,
    wall.b.x * PX_PER_METER,
    wall.b.y * PX_PER_METER,
  ];

  function handleDragStart() {
    dragOrigin.current = { a: wall.a, b: wall.b };
    onBeginTransaction();
  }

  function handleDragMove(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const dx = node.x() / PX_PER_METER;
    const dy = node.y() / PX_PER_METER;
    const origin = dragOrigin.current;
    if (!origin) return;
    onMoveLive(
      { x: origin.a.x + dx, y: origin.a.y + dy },
      { x: origin.b.x + dx, y: origin.b.y + dy },
    );
  }

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const dx = node.x() / PX_PER_METER;
    const dy = node.y() / PX_PER_METER;
    const origin = dragOrigin.current;
    node.position({ x: 0, y: 0 });
    if (!origin) return;
    const newA = snapPoint({ x: origin.a.x + dx, y: origin.a.y + dy }, gridSize);
    const newB = snapPoint({ x: origin.b.x + dx, y: origin.b.y + dy }, gridSize);
    onMoveEnd(newA, newB);
    onEndTransaction();
    dragOrigin.current = null;
  }

  function handleEndpointDrag(end: "a" | "b", e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const raw = { x: node.x() / PX_PER_METER, y: node.y() / PX_PER_METER };
    const snapped =
      snapToNearestEndpoint(
        raw,
        allWalls.filter((w) => w.id !== wall.id),
        0.2,
      ) ?? snapPoint(raw, gridSize);
    node.position({ x: snapped.x * PX_PER_METER, y: snapped.y * PX_PER_METER });
    if (end === "a") onMoveLive(snapped, wall.b);
    else onMoveLive(wall.a, snapped);
  }

  function handleEndpointDragEnd(end: "a" | "b") {
    if (end === "a") onMoveEnd(wall.a, wall.b);
    else onMoveEnd(wall.a, wall.b);
    onEndTransaction();
  }

  return (
    <Group>
      <Line
        points={points}
        stroke={strokeColor}
        strokeWidth={Math.max(wall.thickness * PX_PER_METER, 4)}
        lineCap="square"
        hitStrokeWidth={Math.max(wall.thickness * PX_PER_METER, 16)}
        draggable={interactive && selected}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        opacity={isAuto ? 0.5 + confidence * 0.5 : 1}
        dash={isAuto ? [10, 6] : undefined}
      />
      {selected && interactive && (
        <>
          <Circle
            x={wall.a.x * PX_PER_METER}
            y={wall.a.y * PX_PER_METER}
            radius={6}
            fill="#3b82f6"
            draggable
            onDragStart={onBeginTransaction}
            onDragMove={(e) => handleEndpointDrag("a", e)}
            onDragEnd={() => handleEndpointDragEnd("a")}
          />
          <Circle
            x={wall.b.x * PX_PER_METER}
            y={wall.b.y * PX_PER_METER}
            radius={6}
            fill="#3b82f6"
            draggable
            onDragStart={onBeginTransaction}
            onDragMove={(e) => handleEndpointDrag("b", e)}
            onDragEnd={() => handleEndpointDragEnd("b")}
          />
        </>
      )}
    </Group>
  );
}
