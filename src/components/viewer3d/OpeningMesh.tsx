"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Opening, Wall } from "@/lib/types";

interface OpeningMeshProps {
  wall: Wall;
  opening: Opening;
}

export default function OpeningMesh({ wall, opening }: OpeningMeshProps) {
  const dir = useMemo(
    () => new THREE.Vector3(wall.b.x - wall.a.x, 0, wall.b.y - wall.a.y).normalize(),
    [wall.a.x, wall.a.y, wall.b.x, wall.b.y],
  );
  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir),
    [dir],
  );
  const a3 = new THREE.Vector3(wall.a.x, 0, wall.a.y);
  const center = a3.clone().addScaledVector(dir, opening.offset);
  const midHeight = opening.sill + opening.height / 2;
  const isDoor = opening.type === "door";

  return (
    <mesh position={[center.x, midHeight, center.z]} quaternion={quaternion}>
      <boxGeometry args={[opening.width * 0.94, opening.height * 0.96, wall.thickness * 0.5]} />
      {isDoor ? (
        <meshStandardMaterial color="#6b4a30" roughness={0.7} />
      ) : (
        <meshPhysicalMaterial
          color="#bfe3f0"
          roughness={0.05}
          transmission={0.9}
          thickness={0.02}
          transparent
          opacity={0.5}
        />
      )}
    </mesh>
  );
}
