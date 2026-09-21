"use client";

import { useRef } from "react";
import { Circle, Group, Line, Text } from "react-konva";
import type Konva from "konva";
import type { Point, Room } from "@/lib/types";
import { snapPoint, polygonCentroid, polygonArea } from "@/lib/geometry";
import { getFloorMaterial } from "@/lib/materials";
import { PX_PER_METER } from "./constants";

interface RoomShapeProps {
  room: Room;
  selected: boolean;
  interactive: boolean;
  gridSize: number;
  onSelect: () => void;
  onMoveLive: (points: Point[]) => void;
  onMoveEnd: (points: Point[]) => void;
  onBeginTransaction: () => void;
  onEndTransaction: () => void;
}

export default function RoomShape({
  room,
  selected,
  interactive,
  gridSize,
  onSelect,
  onMoveLive,
  onMoveEnd,
  onBeginTransaction,
  onEndTransaction,
}: RoomShapeProps) {
  const dragOrigin = useRef<Point[] | null>(null);

  const flat = room.points.flatMap((p) => [p.x * PX_PER_METER, p.y * PX_PER_METER]);
  const material = getFloorMaterial(room.floorMaterial);
  const isAuto = room.source === "auto";
  const confidence = room.confidence ?? 1;
  const centroid = polygonCentroid(room.points);
  const areaM2 = Math.abs(polygonArea(room.points));

  function handleDragStart() {
    dragOrigin.current = room.points;
    onBeginTransaction();
  }

  function handleDragMove(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const dx = node.x() / PX_PER_METER;
    const dy = node.y() / PX_PER_METER;
    const origin = dragOrigin.current;
    if (!origin) return;
    onMoveLive(origin.map((p) => ({ x: p.x + dx, y: p.y + dy })));
  }

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const dx = node.x() / PX_PER_METER;
    const dy = node.y() / PX_PER_METER;
    const origin = dragOrigin.current;
    node.position({ x: 0, y: 0 });
    if (!origin) return;
    onMoveEnd(origin.map((p) => snapPoint({ x: p.x + dx, y: p.y + dy }, gridSize)));
    onEndTransaction();
    dragOrigin.current = null;
  }

  function handleVertexDrag(index: number, e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const raw = snapPoint({ x: node.x() / PX_PER_METER, y: node.y() / PX_PER_METER }, gridSize);
    node.position({ x: raw.x * PX_PER_METER, y: raw.y * PX_PER_METER });
    const nextPoints = room.points.map((p, i) => (i === index ? raw : p));
    onMoveLive(nextPoints);
  }

  function handleVertexDragEnd() {
    onMoveEnd(room.points);
    onEndTransaction();
  }

  return (
    <Group>
      <Line
        points={flat}
        closed
        fill={selected ? "rgba(59,130,246,0.25)" : `${material.baseColor}55`}
        stroke={selected ? "#3b82f6" : isAuto ? "#f59e0b" : "#9ca3af"}
        strokeWidth={selected ? 2 : 1.5}
        dash={isAuto ? [8, 5] : undefined}
        opacity={isAuto ? 0.5 + confidence * 0.5 : 1}
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
      />
      <Text
        x={centroid.x * PX_PER_METER - 40}
        y={centroid.y * PX_PER_METER - 8}
        width={80}
        align="center"
        text={`${room.name}\n${areaM2.toFixed(1)} m²`}
        fontSize={12}
        fill="#e5e7eb"
        listening={false}
      />
      {selected &&
        interactive &&
        room.points.map((p, i) => (
          <Circle
            key={i}
            x={p.x * PX_PER_METER}
            y={p.y * PX_PER_METER}
            radius={6}
            fill="#3b82f6"
            draggable
            onDragStart={onBeginTransaction}
            onDragMove={(e) => handleVertexDrag(i, e)}
            onDragEnd={handleVertexDragEnd}
          />
        ))}
    </Group>
  );
}
