"use client";

import type { ThreeEvent } from "@react-three/fiber";
import type { FurniturePlacement } from "@/lib/types";
import FurnitureModel from "./FurnitureModel";

interface FurnitureItem3DProps {
  placement: FurniturePlacement;
  selected: boolean;
  onSelect: () => void;
  onStartDrag: () => void;
}

export default function FurnitureItem3D({ placement, selected, onSelect, onStartDrag }: FurnitureItem3DProps) {
  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    onSelect();
    onStartDrag();
  }

  return (
    <group
      position={[placement.x, 0, placement.y]}
      rotation={[0, placement.rotation, 0]}
      scale={placement.scale}
      onPointerDown={handlePointerDown}
    >
      <FurnitureModel catalogId={placement.catalogId} highlighted={selected} />
    </group>
  );
}
