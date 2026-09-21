import type { Room, Wall } from "./types";
import { distance, findClosedLoops } from "./geometry";

export interface RawSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const MIN_WALL_LENGTH_M = 0.3;
const ANGLE_SNAP_STEP_DEG = 15;
const ANGLE_SNAP_TOLERANCE_DEG = 6;

function snapAngleDeg(deg: number): { snapped: number; wasSnapped: boolean } {
  const nearest = Math.round(deg / ANGLE_SNAP_STEP_DEG) * ANGLE_SNAP_STEP_DEG;
  const diff = Math.abs(deg - nearest);
  if (diff <= ANGLE_SNAP_TOLERANCE_DEG) return { snapped: nearest, wasSnapped: diff > 0.01 };
  return { snapped: deg, wasSnapped: false };
}

export interface RecognizedPlan {
  walls: Wall[];
  rooms: Room[];
}

const MAX_PROCESSING_DIMENSION_PX = 1400;

/**
 * Downscales the uploaded image onto a canvas before running the wall-line
 * heuristic on it. A full-resolution scan (often 3000-8000px wide) would make
 * that pass slower for no real accuracy gain; capping the longest side to
 * ~1400px keeps it fast (a few tens of milliseconds) without a meaningful
 * accuracy loss (the result is always a rough draft the user corrects by hand
 * anyway).
 */
export function resizeImageForProcessing(
  image: HTMLImageElement,
  maxDim = MAX_PROCESSING_DIMENSION_PX,
): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Estimates meters-per-pixel from the plan's known floor area alone, assuming
 * the photographed/scanned plan fills the image with the same proportions as
 * the image itself (width/height ratio). This is only ever a starting estimate
 * for the draft; the user reviews and fixes every wall afterwards regardless.
 */
export function metersPerPixelFromArea(areaM2: number, widthPx: number, heightPx: number): number {
  const aspect = widthPx / Math.max(heightPx, 1);
  const safeArea = Math.max(areaM2, 1);
  return Math.sqrt(safeArea * aspect) / widthPx;
}

/**
 * Turns raw line segments (in image pixel coordinates) into wall/room
 * candidates in meters. Pure geometry, no OpenCV dependency. This is always
 * a starting draft: every wall carries a confidence score and is flagged
 * `source: 'auto'` for mandatory manual review before generating 3D.
 */
export function buildWallsFromSegments(segments: RawSegment[], metersPerPixel: number): RecognizedPlan {
  const walls: Wall[] = [];
  for (const { x1, y1, x2, y2 } of segments) {
    const a = { x: x1 * metersPerPixel, y: y1 * metersPerPixel };
    const b = { x: x2 * metersPerPixel, y: y2 * metersPerPixel };
    const lengthM = distance(a, b);
    if (lengthM < MIN_WALL_LENGTH_M) continue;

    const angleDeg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    const { snapped, wasSnapped } = snapAngleDeg(angleDeg);
    let bAdjusted = b;
    if (wasSnapped) {
      const rad = (snapped * Math.PI) / 180;
      bAdjusted = { x: a.x + Math.cos(rad) * lengthM, y: a.y + Math.sin(rad) * lengthM };
    }

    const lengthConfidence = Math.min(1, lengthM / 2);
    const confidence = Math.max(0.15, wasSnapped ? lengthConfidence * 0.85 : lengthConfidence);

    walls.push({
      id: crypto.randomUUID(),
      a,
      b: bAdjusted,
      thickness: 0.15,
      source: "auto",
      confidence,
    });
  }

  // A noisy real photo can make Hough return hundreds of overlapping/duplicate
  // segments (e.g. both edges of every thick line). Room-loop tracing on that
  // many walls gets expensive for little benefit here, since this is always a
  // draft the user cleans up by hand anyway — so skip it past this cap and let
  // "Rileva stanze da muri" re-run it later once the walls are trimmed down.
  const MAX_WALLS_FOR_ROOM_DETECTION = 150;
  const loops = walls.length <= MAX_WALLS_FOR_ROOM_DETECTION ? findClosedLoops(walls, 0.15) : [];
  const rooms: Room[] = loops.map((points, i) => ({
    id: crypto.randomUUID(),
    name: `Stanza ${i + 1}`,
    points,
    floorMaterial: "wood-oak",
    source: "auto",
    confidence: 0.5,
  }));

  return { walls, rooms };
}
