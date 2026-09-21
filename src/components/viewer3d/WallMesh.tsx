"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Opening, Wall } from "@/lib/types";
import { wallLength } from "@/lib/geometry";
import { buildWallSegments } from "@/lib/wallSegments3d";
import { getWallMaterial } from "@/lib/materials";

interface WallMeshProps {
  wall: Wall;
  openings: Opening[];
  wallHeight: number;
  materialId: string;
}

export default function WallMesh({ wall, openings, wallHeight, materialId }: WallMeshProps) {
  const len = wallLength(wall);

  const dir = useMemo(() => {
    return new THREE.Vector3(wall.b.x - wall.a.x, 0, wall.b.y - wall.a.y).normalize();
  }, [wall.a.x, wall.a.y, wall.b.x, wall.b.y]);

  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir),
    [dir],
  );

  const segments = useMemo(
    () =>
      buildWallSegments(
        len,
        openings.map((o) => ({ offset: o.offset, width: o.width, sill: o.sill, height: o.height })),
        wallHeight,
      ),
    [len, openings, wallHeight],
  );

  const material = getWallMaterial(materialId);
  const isAuto = wall.source === "auto";
  const confidence = wall.confidence ?? 1;
  const a3 = new THREE.Vector3(wall.a.x, 0, wall.a.y);

  return (
    <group>
      {segments.map((seg, i) => {
        const centerOffset = (seg.start + seg.end) / 2;
        const midHeight = (seg.yFrom + seg.yTo) / 2;
        const center = a3.clone().addScaledVector(dir, centerOffset);
        return (
          <mesh key={i} position={[center.x, midHeight, center.z]} quaternion={quaternion} castShadow receiveShadow>
            <boxGeometry args={[seg.end - seg.start, seg.yTo - seg.yFrom, wall.thickness]} />
            <meshStandardMaterial
              color={material.color}
              roughness={material.roughness}
              transparent={isAuto}
              opacity={isAuto ? 0.4 + confidence * 0.6 : 1}
            />
          </mesh>
        );
      })}
    </group>
  );
}
