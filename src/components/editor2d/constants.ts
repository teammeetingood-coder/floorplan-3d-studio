export const PX_PER_METER = 60;
export const DEFAULT_WALL_THICKNESS = 0.1;
export const DEFAULT_DOOR = { width: 0.9, height: 2.1, sill: 0 };
export const DEFAULT_WINDOW = { width: 1.2, height: 1.3, sill: 0.9 };
export const ENDPOINT_SNAP_TOLERANCE_M = 0.2;
export const WALL_PICK_TOLERANCE_M = 0.3;

export type Tool = "select" | "wall" | "room" | "door" | "window";
