"use client";

import * as THREE from "three";
import { getCatalogItem } from "@/lib/furnitureCatalog";

interface FurnitureModelProps {
  catalogId: string;
  highlighted?: boolean;
}

/**
 * Every furniture piece is built from labelled primitive geometry (boxes, cylinders,
 * spheres) rather than external assets, so the catalog stays self-contained and has
 * no third-party licensing or network dependency.
 */
export default function FurnitureModel({ catalogId, highlighted }: FurnitureModelProps) {
  const item = getCatalogItem(catalogId);
  const { width: w, depth: d, height: h, color } = item;
  const emissive = highlighted ? "#3b82f6" : "#000000";
  const emissiveIntensity = highlighted ? 0.4 : 0;

  const seatHeight = h * 0.5;

  switch (catalogId) {
    case "sofa":
    case "armchair":
      return (
        <group>
          <mesh position={[0, seatHeight / 2, 0]} castShadow>
            <boxGeometry args={[w, seatHeight, d]} />
            <meshStandardMaterial color={color} roughness={0.8} emissive={emissive} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh position={[0, h * 0.75, -d * 0.4]} castShadow>
            <boxGeometry args={[w, h * 0.5, d * 0.2]} />
            <meshStandardMaterial color={color} roughness={0.8} emissive={emissive} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh position={[-w * 0.45, h * 0.55, 0]} castShadow>
            <boxGeometry args={[w * 0.1, h * 0.6, d]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[w * 0.45, h * 0.55, 0]} castShadow>
            <boxGeometry args={[w * 0.1, h * 0.6, d]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </group>
      );

    case "chair":
      return (
        <group>
          <mesh position={[0, seatHeight, 0]} castShadow>
            <boxGeometry args={[w, h * 0.08, d]} />
            <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh position={[0, h * 0.75, -d * 0.45]} castShadow>
            <boxGeometry args={[w, h * 0.5, d * 0.1]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
            <mesh key={i} position={[(sx * w) / 2.3, seatHeight / 2, (sz * d) / 2.3]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, seatHeight, 8]} />
              <meshStandardMaterial color="#3a2c1e" />
            </mesh>
          ))}
        </group>
      );

    case "floor-lamp":
      return (
        <group>
          <mesh position={[0, h * 0.02, 0]}>
            <cylinderGeometry args={[w * 0.5, w * 0.5, h * 0.02, 16]} />
            <meshStandardMaterial color="#2a2a2a" />
          </mesh>
          <mesh position={[0, h * 0.45, 0]}>
            <cylinderGeometry args={[0.02, 0.02, h * 0.85, 8]} />
            <meshStandardMaterial color="#2a2a2a" />
          </mesh>
          <mesh position={[0, h * 0.9, 0]} castShadow>
            <coneGeometry args={[w * 0.45, h * 0.2, 16, 1, true]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={highlighted ? 0.6 : 0.25}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      );

    case "plant":
      return (
        <group>
          <mesh position={[0, h * 0.12, 0]} castShadow>
            <cylinderGeometry args={[w * 0.4, w * 0.5, h * 0.25, 12]} />
            <meshStandardMaterial color="#8a5a3b" emissive={emissive} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh position={[0, h * 0.65, 0]} castShadow>
            <icosahedronGeometry args={[w * 0.6, 1]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
        </group>
      );

    case "bathtub":
      return (
        <mesh position={[0, h / 2, 0]} castShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={color} roughness={0.2} emissive={emissive} emissiveIntensity={emissiveIntensity} />
        </mesh>
      );

    case "toilet":
      return (
        <group>
          <mesh position={[0, h * 0.5, -d * 0.15]} castShadow>
            <boxGeometry args={[w, h, d * 0.6]} />
            <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh position={[0, h * 0.9, d * 0.15]} castShadow>
            <boxGeometry args={[w * 0.5, h * 0.25, d * 0.3]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );

    default:
      return (
        <mesh position={[0, h / 2, 0]} castShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={color} roughness={0.7} emissive={emissive} emissiveIntensity={emissiveIntensity} />
        </mesh>
      );
  }
}
