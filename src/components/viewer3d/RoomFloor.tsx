"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Room } from "@/lib/types";
import { createFloorTexture } from "@/lib/materials";

interface RoomFloorProps {
  room: Room;
}

export default function RoomFloor({ room }: RoomFloorProps) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    room.points.forEach((p, i) => {
      if (i === 0) shape.moveTo(p.x, -p.y);
      else shape.lineTo(p.x, -p.y);
    });
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [room.points]);

  const texture = useMemo(() => {
    const base = createFloorTexture(room.floorMaterial);
    const clone = base.clone();
    clone.needsUpdate = true;
    const xs = room.points.map((p) => p.x);
    const ys = room.points.map((p) => p.y);
    const width = Math.max(Math.max(...xs) - Math.min(...xs), 0.5);
    const depth = Math.max(Math.max(...ys) - Math.min(...ys), 0.5);
    clone.repeat.set(width, depth);
    return clone;
  }, [room.floorMaterial, room.points]);

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial map={texture} roughness={0.85} side={THREE.DoubleSide} />
    </mesh>
  );
}
