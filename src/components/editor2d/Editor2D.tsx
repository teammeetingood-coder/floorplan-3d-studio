"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { useProjectStore } from "@/lib/store";
import {
  distance,
  distanceToSegment,
  findClosedLoops,
  polygonCentroid,
  snapPoint,
  snapToNearestEndpoint,
  wallLength,
} from "@/lib/geometry";
import type { Point } from "@/lib/types";
import GridBackground from "./GridBackground";
import WallShape from "./WallShape";
import RoomShape from "./RoomShape";
import OpeningShape from "./OpeningShape";
import Toolbar2D from "./Toolbar2D";
import PropertiesPanel from "./PropertiesPanel";
import {
  DEFAULT_DOOR,
  DEFAULT_WALL_THICKNESS,
  DEFAULT_WINDOW,
  PX_PER_METER,
  WALL_PICK_TOLERANCE_M,
  type Tool,
} from "./constants";

type Selection = { type: "wall" | "room" | "opening"; id: string } | null;

export default function Editor2D() {
  const project = useProjectStore((s) => s.project);
  const addWall = useProjectStore((s) => s.addWall);
  const updateWallLive = useProjectStore((s) => s.updateWallLive);
  const updateWall = useProjectStore((s) => s.updateWall);
  const removeWall = useProjectStore((s) => s.removeWall);
  const addRoom = useProjectStore((s) => s.addRoom);
  const updateRoomLive = useProjectStore((s) => s.updateRoomLive);
  const updateRoom = useProjectStore((s) => s.updateRoom);
  const removeRoom = useProjectStore((s) => s.removeRoom);
  const addOpening = useProjectStore((s) => s.addOpening);
  const updateOpeningLive = useProjectStore((s) => s.updateOpeningLive);
  const updateOpening = useProjectStore((s) => s.updateOpening);
  const removeOpening = useProjectStore((s) => s.removeOpening);
  const beginTransaction = useProjectStore((s) => s.beginTransaction);
  const endTransaction = useProjectStore((s) => s.endTransaction);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const acceptRecognition = useProjectStore((s) => s.acceptRecognition);
  const discardRecognition = useProjectStore((s) => s.discardRecognition);

  const [tool, setTool] = useState<Tool>("select");
  const [selection, setSelection] = useState<Selection>(null);
  const [view, setView] = useState({ scale: 1, x: 500, y: 350 });
  const [chainStart, setChainStart] = useState<Point | null>(null);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [roomPoints, setRoomPoints] = useState<Point[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const panState = useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);

  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const changeTool = useCallback((next: Tool) => {
    setChainStart(null);
    setPreviewPoint(null);
    setRoomPoints([]);
    setTool(next);
  }, []);

  const toWorld = useCallback(
    (clientX: number, clientY: number): Point => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const layerX = (clientX - rect.left - view.x) / view.scale;
      const layerY = (clientY - rect.top - view.y) / view.scale;
      return { x: layerX / PX_PER_METER, y: layerY / PX_PER_METER };
    },
    [view],
  );

  const snappedWorldPoint = useCallback(
    (clientX: number, clientY: number): Point => {
      const raw = toWorld(clientX, clientY);
      return snapToNearestEndpoint(raw, project.walls, 0.2) ?? snapPoint(raw, project.gridSize);
    },
    [toWorld, project.walls, project.gridSize],
  );

  const deleteSelected = useCallback(() => {
    if (!selection) return;
    if (selection.type === "wall") removeWall(selection.id);
    else if (selection.type === "room") removeRoom(selection.id);
    else removeOpening(selection.id);
    setSelection(null);
  }, [selection, removeWall, removeRoom, removeOpening]);

  const detectRooms = useCallback(() => {
    const loops = findClosedLoops(project.walls);
    const existingCentroids = project.rooms.map((r) => polygonCentroid(r.points));
    loops.forEach((points, i) => {
      const centroid = polygonCentroid(points);
      const isDuplicate = existingCentroids.some((c) => distance(c, centroid) < 0.3);
      if (isDuplicate) return;
      addRoom({
        name: `Stanza ${project.rooms.length + i + 1}`,
        points,
        floorMaterial: "wood-oak",
        source: "auto",
        confidence: 0.7,
      });
    });
  }, [project.walls, project.rooms, addRoom]);

  const handleRootClick = useCallback(
    (e: ReactMouseEvent<SVGSVGElement>) => {
      if (panState.current?.moved) return;

      if (tool === "select") {
        setSelection(null);
      } else if (tool === "wall") {
        const p = snappedWorldPoint(e.clientX, e.clientY);
        if (!chainStart) {
          setChainStart(p);
        } else {
          addWall({ a: chainStart, b: p, thickness: DEFAULT_WALL_THICKNESS, source: "manual" });
          setChainStart(p);
        }
      } else if (tool === "room") {
        const p = snapPoint(toWorld(e.clientX, e.clientY), project.gridSize);
        if (roomPoints.length >= 3 && distance(p, roomPoints[0]) < 0.15) {
          addRoom({
            name: `Stanza ${project.rooms.length + 1}`,
            points: roomPoints,
            floorMaterial: "wood-oak",
            source: "manual",
          });
          setRoomPoints([]);
        } else {
          setRoomPoints((pts) => [...pts, p]);
        }
      } else if (tool === "door" || tool === "window") {
        const p = toWorld(e.clientX, e.clientY);
        let best: { wallId: string; offset: number; dist: number } | null = null;
        for (const wall of project.walls) {
          const { distance: d, t } = distanceToSegment(p, wall.a, wall.b);
          if (d < WALL_PICK_TOLERANCE_M && (!best || d < best.dist)) {
            best = { wallId: wall.id, offset: t * wallLength(wall), dist: d };
          }
        }
        if (best) {
          const defaults = tool === "door" ? DEFAULT_DOOR : DEFAULT_WINDOW;
          addOpening({ wallId: best.wallId, type: tool, offset: best.offset, ...defaults });
        }
      }
    },
    [tool, chainStart, roomPoints, project.walls, project.gridSize, project.rooms.length, addWall, addRoom, addOpening, snappedWorldPoint, toWorld],
  );

  const handleRootPointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (panState.current) {
        const dx = e.clientX - panState.current.startX;
        const dy = e.clientY - panState.current.startY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) panState.current.moved = true;
        setView((v) => ({ ...v, x: panState.current!.originX + dx, y: panState.current!.originY + dy }));
        return;
      }
      if (tool === "wall" && chainStart) {
        setPreviewPoint(snappedWorldPoint(e.clientX, e.clientY));
      } else if (tool === "room" && roomPoints.length > 0) {
        setPreviewPoint(snapPoint(toWorld(e.clientX, e.clientY), project.gridSize));
      }
    },
    [tool, chainStart, roomPoints.length, snappedWorldPoint, toWorld, project.gridSize],
  );

  const handleRootPointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (tool !== "select") return;
      e.currentTarget.setPointerCapture(e.pointerId);
      panState.current = { startX: e.clientX, startY: e.clientY, originX: view.x, originY: view.y, moved: false };
    },
    [tool, view.x, view.y],
  );

  const handleRootPointerUp = useCallback(() => {
    panState.current = null;
  }, []);

  const handleWheel = useCallback((e: ReactWheelEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setView((v) => {
      const worldX = (px - v.x) / v.scale;
      const worldY = (py - v.y) / v.scale;
      const direction = e.deltaY > 0 ? -1 : 1;
      const newScale = Math.min(Math.max(v.scale * (1 + direction * 0.1), 0.2), 4);
      return { scale: newScale, x: px - worldX * newScale, y: py - worldY * newScale };
    });
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      if (e.key === "Escape") {
        setChainStart(null);
        setRoomPoints([]);
        setSelection(null);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (e.key.toLowerCase() === "v") changeTool("select");
      else if (e.key.toLowerCase() === "w") changeTool("wall");
      else if (e.key.toLowerCase() === "r") changeTool("room");
      else if (e.key.toLowerCase() === "d") changeTool("door");
      else if (e.key.toLowerCase() === "f") changeTool("window");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelected, undo, redo, changeTool]);

  const selectionObject = useMemo(() => {
    if (!selection) return null;
    if (selection.type === "wall") {
      const w = project.walls.find((w) => w.id === selection.id);
      return w ? { type: "wall" as const, element: w } : null;
    }
    if (selection.type === "room") {
      const r = project.rooms.find((r) => r.id === selection.id);
      return r ? { type: "room" as const, element: r } : null;
    }
    const o = project.openings.find((o) => o.id === selection.id);
    return o ? { type: "opening" as const, element: o } : null;
  }, [selection, project.walls, project.rooms, project.openings]);

  const cursor = tool === "select" ? "default" : "crosshair";

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-neutral-950">
      <Toolbar2D
        tool={tool}
        onToolChange={changeTool}
        onDeleteSelected={deleteSelected}
        hasSelection={!!selection}
        onDetectRooms={detectRooms}
        needsReview={project.needsReview}
        onAcceptReview={acceptRecognition}
        onDiscardReview={discardRecognition}
      />
      <PropertiesPanel
        selection={selectionObject}
        onUpdateWall={(patch) => selection && updateWall(selection.id, patch)}
        onUpdateRoom={(patch) => selection && updateRoom(selection.id, patch)}
        onUpdateOpening={(patch) => selection && updateOpening(selection.id, patch)}
      />

      <svg
        ref={svgRef}
        width={size.width}
        height={size.height}
        onClick={handleRootClick}
        onPointerDown={handleRootPointerDown}
        onPointerMove={handleRootPointerMove}
        onPointerUp={handleRootPointerUp}
        onWheel={handleWheel}
        style={{ cursor, touchAction: "none" }}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          <GridBackground />

          {project.rooms.map((room) => (
            <RoomShape
              key={room.id}
              room={room}
              selected={selection?.type === "room" && selection.id === room.id}
              interactive={tool === "select"}
              gridSize={project.gridSize}
              toWorld={toWorld}
              onSelect={() => setSelection({ type: "room", id: room.id })}
              onMoveLive={(points) => updateRoomLive(room.id, { points })}
              onMoveEnd={(points) => updateRoomLive(room.id, { points })}
              onBeginTransaction={beginTransaction}
              onEndTransaction={endTransaction}
            />
          ))}

          {project.walls.map((wall) => (
            <WallShape
              key={wall.id}
              wall={wall}
              allWalls={project.walls}
              selected={selection?.type === "wall" && selection.id === wall.id}
              interactive={tool === "select"}
              gridSize={project.gridSize}
              toWorld={toWorld}
              onSelect={() => setSelection({ type: "wall", id: wall.id })}
              onMoveLive={(a, b) => updateWallLive(wall.id, { a, b })}
              onMoveEnd={(a, b) => updateWallLive(wall.id, { a, b })}
              onBeginTransaction={beginTransaction}
              onEndTransaction={endTransaction}
            />
          ))}

          {project.openings.map((opening) => {
            const wall = project.walls.find((w) => w.id === opening.wallId);
            if (!wall) return null;
            return (
              <OpeningShape
                key={opening.id}
                opening={opening}
                wall={wall}
                selected={selection?.type === "opening" && selection.id === opening.id}
                interactive={tool === "select"}
                toWorld={toWorld}
                onSelect={() => setSelection({ type: "opening", id: opening.id })}
                onOffsetLive={(offset) => updateOpeningLive(opening.id, { offset })}
                onOffsetEnd={(offset) => updateOpeningLive(opening.id, { offset })}
                onBeginTransaction={beginTransaction}
                onEndTransaction={endTransaction}
              />
            );
          })}

          {tool === "wall" && chainStart && previewPoint && (
            <line
              x1={chainStart.x * PX_PER_METER}
              y1={chainStart.y * PX_PER_METER}
              x2={previewPoint.x * PX_PER_METER}
              y2={previewPoint.y * PX_PER_METER}
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="6 4"
              pointerEvents="none"
            />
          )}

          {tool === "room" && roomPoints.length > 0 && (
            <polyline
              points={[...roomPoints, ...(previewPoint ? [previewPoint] : [])]
                .map((p) => `${p.x * PX_PER_METER},${p.y * PX_PER_METER}`)
                .join(" ")}
              fill="none"
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="6 4"
              pointerEvents="none"
            />
          )}
        </g>
      </svg>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-neutral-900/80 px-3 py-1.5 text-xs text-neutral-400">
        {tool === "wall" && "Clicca per iniziare un muro, clicca ancora per proseguire la catena. Esc per terminare."}
        {tool === "room" && "Clicca i vertici della stanza, poi clicca vicino al primo punto per chiudere il poligono."}
        {tool === "door" && "Clicca su un muro per posizionare una porta."}
        {tool === "window" && "Clicca su un muro per posizionare una finestra."}
        {tool === "select" && "Seleziona un elemento per modificarlo. Trascina lo sfondo per spostare la vista, Canc per eliminare."}
      </div>
    </div>
  );
}
