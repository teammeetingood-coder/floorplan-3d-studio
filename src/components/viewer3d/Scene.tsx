"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { useProjectStore } from "@/lib/store";
import WallMesh from "./WallMesh";
import OpeningMesh from "./OpeningMesh";
import RoomFloor from "./RoomFloor";
import FurnitureItem3D from "./FurnitureItem3D";

interface SceneProps {
  selectedFurnitureId: string | null;
  onSelectFurniture: (id: string | null) => void;
  dragEnabled: boolean;
  onDraggingChange: (dragging: boolean) => void;
}

export default function Scene({ selectedFurnitureId, onSelectFurniture, dragEnabled, onDraggingChange }: SceneProps) {
  const project = useProjectStore((s) => s.project);
  const updateFurnitureLive = useProjectStore((s) => s.updateFurnitureLive);
  const beginTransaction = useProjectStore((s) => s.beginTransaction);
  const endTransaction = useProjectStore((s) => s.endTransaction);

  const draggingId = useRef<string | null>(null);

  function startDrag(id: string) {
    if (!dragEnabled) return;
    beginTransaction();
    draggingId.current = id;
    // Disables OrbitControls while dragging: it listens for pointer events
    // directly on the canvas DOM element, so stopping propagation on the
    // furniture's R3F pointer event alone doesn't stop the camera from also
    // orbiting/panning at the same time.
    onDraggingChange(true);
  }

  const endDrag = useCallback(() => {
    if (draggingId.current) {
      endTransaction();
      draggingId.current = null;
      onDraggingChange(false);
    }
  }, [endTransaction, onDraggingChange]);

  useEffect(() => {
    window.addEventListener("pointerup", endDrag);
    return () => window.removeEventListener("pointerup", endDrag);
  }, [endDrag]);

  function handleGroundPointerMove(e: ThreeEvent<PointerEvent>) {
    if (!draggingId.current) return;
    updateFurnitureLive(draggingId.current, { x: e.point.x, y: e.point.z });
  }

  function handleGroundPointerDown(e: ThreeEvent<PointerEvent>) {
    if (e.button !== 0) return;
    onSelectFurniture(null);
  }

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.005, 0]}
        receiveShadow
        onPointerMove={handleGroundPointerMove}
        onPointerDown={handleGroundPointerDown}
      >
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#1c1f24" />
      </mesh>

      {project.rooms.map((room) => (
        <RoomFloor key={room.id} room={room} />
      ))}

      {project.walls.map((wall) => (
        <WallMesh
          key={wall.id}
          wall={wall}
          openings={project.openings.filter((o) => o.wallId === wall.id)}
          wallHeight={project.wallHeight}
          materialId={project.wallMaterial}
        />
      ))}

      {project.openings.map((opening) => {
        const wall = project.walls.find((w) => w.id === opening.wallId);
        if (!wall) return null;
        return <OpeningMesh key={opening.id} wall={wall} opening={opening} />;
      })}

      {project.furniture.map((placement) => (
        <FurnitureItem3D
          key={placement.id}
          placement={placement}
          selected={selectedFurnitureId === placement.id}
          onSelect={() => onSelectFurniture(placement.id)}
          onStartDrag={() => startDrag(placement.id)}
        />
      ))}
    </>
  );
}
