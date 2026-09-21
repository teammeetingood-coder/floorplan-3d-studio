export interface Point {
  x: number;
  y: number;
}

export type ElementSource = "manual" | "auto";

export type OpeningType = "door" | "window";

export interface Wall {
  id: string;
  a: Point;
  b: Point;
  /** thickness in meters */
  thickness: number;
  source: ElementSource;
  /** 0..1, only meaningful for source === 'auto' before manual review */
  confidence?: number;
}

export interface Room {
  id: string;
  name: string;
  /** ordered polygon points in meters, world space */
  points: Point[];
  floorMaterial: string;
  source: ElementSource;
  confidence?: number;
}

export interface Opening {
  id: string;
  wallId: string;
  type: OpeningType;
  /** distance in meters from wall.a to the opening center, along the wall */
  offset: number;
  width: number;
  height: number;
  /** height from floor to bottom of the opening (0 for doors) */
  sill: number;
}

export interface FurniturePlacement {
  id: string;
  catalogId: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** default wall height in meters */
  wallHeight: number;
  walls: Wall[];
  rooms: Room[];
  openings: Opening[];
  furniture: FurniturePlacement[];
  wallMaterial: string;
  /** meters represented by one grid cell in the 2D editor */
  gridSize: number;
  /** true right after automatic recognition, cleared once the user confirms the review */
  needsReview: boolean;
  sourceImage?: {
    dataUrl: string;
    /** pixel size of the stored (already downscaled) image */
    width: number;
    height: number;
    /** scale used to position the image in the 2D editor as a trace reference */
    metersPerPixel: number;
  };
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
}

export function createEmptyProject(name: string): Project {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    wallHeight: 2.7,
    walls: [],
    rooms: [],
    openings: [],
    furniture: [],
    wallMaterial: "plaster-white",
    gridSize: 0.1,
    needsReview: false,
  };
}
