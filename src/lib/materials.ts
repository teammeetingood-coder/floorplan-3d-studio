import * as THREE from "three";

export interface FloorMaterialDef {
  id: string;
  label: string;
  baseColor: string;
  accentColor: string;
  pattern: "solid" | "wood" | "tile" | "carpet";
}

export interface WallMaterialDef {
  id: string;
  label: string;
  color: string;
  roughness: number;
}

export const FLOOR_MATERIALS: FloorMaterialDef[] = [
  { id: "wood-oak", label: "Parquet rovere", baseColor: "#b3874c", accentColor: "#96703b", pattern: "wood" },
  { id: "wood-walnut", label: "Parquet noce", baseColor: "#6b4a30", accentColor: "#563a26", pattern: "wood" },
  { id: "tile-white", label: "Piastrelle bianche", baseColor: "#e9e9e4", accentColor: "#c9c9c2", pattern: "tile" },
  { id: "tile-dark", label: "Piastrelle scure", baseColor: "#3b3f43", accentColor: "#2b2e31", pattern: "tile" },
  { id: "carpet-grey", label: "Moquette grigia", baseColor: "#8d8f92", accentColor: "#75767a", pattern: "carpet" },
  { id: "concrete", label: "Cemento", baseColor: "#a9a9a4", accentColor: "#96968f", pattern: "solid" },
];

export const WALL_MATERIALS: WallMaterialDef[] = [
  { id: "plaster-white", label: "Intonaco bianco", color: "#f5f4f0", roughness: 0.9 },
  { id: "plaster-beige", label: "Intonaco beige", color: "#e6d9c3", roughness: 0.9 },
  { id: "plaster-blue", label: "Intonaco azzurro", color: "#c7d9e6", roughness: 0.85 },
  { id: "plaster-green", label: "Intonaco verde salvia", color: "#cdd9c4", roughness: 0.85 },
  { id: "concrete-grey", label: "Cemento grezzo", color: "#9a9a92", roughness: 1 },
];

export function getFloorMaterial(id: string): FloorMaterialDef {
  return FLOOR_MATERIALS.find((m) => m.id === id) ?? FLOOR_MATERIALS[0];
}

export function getWallMaterial(id: string): WallMaterialDef {
  return WALL_MATERIALS.find((m) => m.id === id) ?? WALL_MATERIALS[0];
}

const textureCache = new Map<string, THREE.Texture>();

/** Procedurally draws a floor pattern to a canvas and returns a repeatable THREE texture. Client-only. */
export function createFloorTexture(materialId: string): THREE.Texture {
  const cached = textureCache.get(materialId);
  if (cached) return cached;

  const def = getFloorMaterial(materialId);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = def.baseColor;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = def.accentColor;

  if (def.pattern === "wood") {
    const plankHeight = size / 6;
    for (let row = 0; row < 6; row++) {
      const y = row * plankHeight;
      const offset = row % 2 === 0 ? 0 : size / 4;
      ctx.fillStyle = row % 2 === 0 ? def.baseColor : shade(def.baseColor, -4);
      ctx.fillRect(0, y, size, plankHeight);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
      for (let x = -offset; x < size; x += size / 2) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + plankHeight);
        ctx.stroke();
      }
    }
  } else if (def.pattern === "tile") {
    const tiles = 4;
    const step = size / tiles;
    ctx.lineWidth = 3;
    for (let i = 0; i <= tiles; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * step);
      ctx.lineTo(size, i * step);
      ctx.stroke();
    }
  } else if (def.pattern === "carpet") {
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? def.baseColor : def.accentColor;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(materialId, texture);
  return texture;
}

function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0xff) + percent;
  let b = (num & 0xff) + percent;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
