"use client";

import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Point, Room } from "@/lib/types";
import { snapPoint, polygonCentroid, polygonArea } from "@/lib/geometry";
import { getFloorMaterial } from "@/lib/materials";
import { PX_PER_METER } from "./constants";

interface RoomShapeProps {
  room: Room;
  selected: boolean;
  interactive: boolean;
  gridSize: number;
  toWorld: (clientX: number, clientY: number) => Point;
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
  toWorld,
  onSelect,
  onMoveLive,
  onMoveEnd,
  onBeginTransaction,
  onEndTransaction,
}: RoomShapeProps) {
  const dragOrigin = useRef<{ points: Point[]; grab: Point } | null>(null);

  const points = room.points.map((p) => `${p.x * PX_PER_METER},${p.y * PX_PER_METER}`).join(" ");
  const material = getFloorMaterial(room.floorMaterial);
  const isAuto = room.source === "auto";
  const confidence = room.confidence ?? 1;
  const centroid = polygonCentroid(room.points);
  const areaM2 = Math.abs(polygonArea(room.points));

  function handleBodyPointerDown(e: ReactPointerEvent<SVGPolygonElement>) {
    e.stopPropagation();
    onSelect();
    if (!interactive || !selected) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onBeginTransaction();
    dragOrigin.current = { points: room.points, grab: toWorld(e.clientX, e.clientY) };
  }

  function handleBodyPointerMove(e: ReactPointerEvent<SVGPolygonElement>) {
    const origin = dragOrigin.current;
    if (!origin) return;
    const p = toWorld(e.clientX, e.clientY);
    const dx = p.x - origin.grab.x;
    const dy = p.y - origin.grab.y;
    onMoveLive(origin.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })));
  }

  function handleBodyPointerUp(e: ReactPointerEvent<SVGPolygonElement>) {
    const origin = dragOrigin.current;
    if (!origin) return;
    const p = toWorld(e.clientX, e.clientY);
    const dx = p.x - origin.grab.x;
    const dy = p.y - origin.grab.y;
    onMoveEnd(origin.points.map((pt) => snapPoint({ x: pt.x + dx, y: pt.y + dy }, gridSize)));
    onEndTransaction();
    dragOrigin.current = null;
  }

  function handleVertexPointerDown(e: ReactPointerEvent<SVGCircleElement>) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    onBeginTransaction();
  }

  function handleVertexPointerMove(index: number, e: ReactPointerEvent<SVGCircleElement>) {
    const raw = snapPoint(toWorld(e.clientX, e.clientY), gridSize);
    onMoveLive(room.points.map((p, i) => (i === index ? raw : p)));
  }

  function handleVertexPointerUp() {
    onMoveEnd(room.points);
    onEndTransaction();
  }

  return (
    <g>
      <polygon
        points={points}
        fill={selected ? "rgba(59,130,246,0.25)" : `${material.baseColor}55`}
        stroke={selected ? "#3b82f6" : isAuto ? "#f59e0b" : "#9ca3af"}
        strokeWidth={selected ? 2 : 1.5}
        strokeDasharray={isAuto ? "8 5" : undefined}
        opacity={isAuto ? 0.5 + confidence * 0.5 : 1}
        pointerEvents={interactive ? "all" : "none"}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handleBodyPointerDown}
        onPointerMove={handleBodyPointerMove}
        onPointerUp={handleBodyPointerUp}
        style={{ cursor: selected ? "move" : "pointer" }}
      />
      <text
        x={centroid.x * PX_PER_METER}
        y={centroid.y * PX_PER_METER}
        textAnchor="middle"
        fontSize={12}
        fill="#e5e7eb"
        pointerEvents="none"
      >
        <tspan x={centroid.x * PX_PER_METER} dy="-0.2em">
          {room.name}
        </tspan>
        <tspan x={centroid.x * PX_PER_METER} dy="1.2em">
          {areaM2.toFixed(1)} m²
        </tspan>
      </text>
      {selected &&
        interactive &&
        room.points.map((p, i) => (
          <circle
            key={i}
            cx={p.x * PX_PER_METER}
            cy={p.y * PX_PER_METER}
            r={6}
            fill="#3b82f6"
            onPointerDown={handleVertexPointerDown}
            onPointerMove={(e) => handleVertexPointerMove(i, e)}
            onPointerUp={handleVertexPointerUp}
            style={{ cursor: "grab" }}
          />
        ))}
    </g>
  );
}
