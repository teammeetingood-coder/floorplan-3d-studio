"use client";

import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Point, Wall } from "@/lib/types";
import { snapPoint, snapToNearestEndpoint } from "@/lib/geometry";
import { PX_PER_METER } from "./constants";

interface WallShapeProps {
  wall: Wall;
  allWalls: Wall[];
  selected: boolean;
  interactive: boolean;
  gridSize: number;
  toWorld: (clientX: number, clientY: number) => Point;
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
  toWorld,
  onSelect,
  onMoveLive,
  onMoveEnd,
  onBeginTransaction,
  onEndTransaction,
}: WallShapeProps) {
  const dragOrigin = useRef<{ a: Point; b: Point; grab: Point } | null>(null);

  const isAuto = wall.source === "auto";
  const confidence = wall.confidence ?? 1;
  const strokeColor = selected ? "#3b82f6" : isAuto ? "#f59e0b" : "#e5e7eb";
  const strokeOpacity = isAuto ? 0.4 + confidence * 0.6 : 1;
  const strokeWidthPx = Math.max(wall.thickness * PX_PER_METER, 4);

  function handleBodyPointerDown(e: ReactPointerEvent<SVGLineElement>) {
    e.stopPropagation();
    onSelect();
    if (!interactive || !selected) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onBeginTransaction();
    dragOrigin.current = { a: wall.a, b: wall.b, grab: toWorld(e.clientX, e.clientY) };
  }

  function handleBodyPointerMove(e: ReactPointerEvent<SVGLineElement>) {
    const origin = dragOrigin.current;
    if (!origin) return;
    const p = toWorld(e.clientX, e.clientY);
    const dx = p.x - origin.grab.x;
    const dy = p.y - origin.grab.y;
    onMoveLive({ x: origin.a.x + dx, y: origin.a.y + dy }, { x: origin.b.x + dx, y: origin.b.y + dy });
  }

  function handleBodyPointerUp(e: ReactPointerEvent<SVGLineElement>) {
    const origin = dragOrigin.current;
    if (!origin) return;
    const p = toWorld(e.clientX, e.clientY);
    const dx = p.x - origin.grab.x;
    const dy = p.y - origin.grab.y;
    const newA = snapPoint({ x: origin.a.x + dx, y: origin.a.y + dy }, gridSize);
    const newB = snapPoint({ x: origin.b.x + dx, y: origin.b.y + dy }, gridSize);
    onMoveEnd(newA, newB);
    onEndTransaction();
    dragOrigin.current = null;
  }

  function handleEndpointPointerDown(e: ReactPointerEvent<SVGCircleElement>) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    onBeginTransaction();
  }

  function handleEndpointPointerMove(end: "a" | "b", e: ReactPointerEvent<SVGCircleElement>) {
    const raw = toWorld(e.clientX, e.clientY);
    const snapped =
      snapToNearestEndpoint(raw, allWalls.filter((w) => w.id !== wall.id), 0.2) ??
      snapPoint(raw, gridSize);
    if (end === "a") onMoveLive(snapped, wall.b);
    else onMoveLive(wall.a, snapped);
  }

  function handleEndpointPointerUp() {
    onMoveEnd(wall.a, wall.b);
    onEndTransaction();
  }

  return (
    <g>
      <line
        x1={wall.a.x * PX_PER_METER}
        y1={wall.a.y * PX_PER_METER}
        x2={wall.b.x * PX_PER_METER}
        y2={wall.b.y * PX_PER_METER}
        stroke={strokeColor}
        strokeOpacity={strokeOpacity}
        strokeWidth={strokeWidthPx}
        strokeDasharray={isAuto ? "10 6" : undefined}
        strokeLinecap="square"
        pointerEvents={interactive ? "stroke" : "none"}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handleBodyPointerDown}
        onPointerMove={handleBodyPointerMove}
        onPointerUp={handleBodyPointerUp}
        style={{ cursor: selected ? "move" : "pointer" }}
      />
      {/* wide invisible line to make thin walls easy to click/drag; only when the select tool is active */}
      <line
        x1={wall.a.x * PX_PER_METER}
        y1={wall.a.y * PX_PER_METER}
        x2={wall.b.x * PX_PER_METER}
        y2={wall.b.y * PX_PER_METER}
        stroke="rgba(0,0,0,0.001)"
        strokeWidth={Math.max(strokeWidthPx, 16)}
        pointerEvents={interactive ? "stroke" : "none"}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handleBodyPointerDown}
        onPointerMove={handleBodyPointerMove}
        onPointerUp={handleBodyPointerUp}
        style={{ cursor: selected ? "move" : "pointer" }}
      />
      {selected && interactive && (
        <>
          <circle
            cx={wall.a.x * PX_PER_METER}
            cy={wall.a.y * PX_PER_METER}
            r={6}
            fill="#3b82f6"
            onPointerDown={handleEndpointPointerDown}
            onPointerMove={(e) => handleEndpointPointerMove("a", e)}
            onPointerUp={handleEndpointPointerUp}
            style={{ cursor: "grab" }}
          />
          <circle
            cx={wall.b.x * PX_PER_METER}
            cy={wall.b.y * PX_PER_METER}
            r={6}
            fill="#3b82f6"
            onPointerDown={handleEndpointPointerDown}
            onPointerMove={(e) => handleEndpointPointerMove("b", e)}
            onPointerUp={handleEndpointPointerUp}
            style={{ cursor: "grab" }}
          />
        </>
      )}
    </g>
  );
}
