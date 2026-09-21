import type { Room, Wall } from "./types";
import { distance, findClosedLoops } from "./geometry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CvModule = any;

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

/**
 * Runs a Canny edge detection + Hough line pipeline over the uploaded image and
 * returns a rough set of walls (and any closed room loops found among them).
 * This is always a starting draft: every wall carries a confidence score and is
 * flagged as `source: 'auto'` for mandatory manual review before generating 3D.
 */
export function recognizePlanFromImage(
  cv: CvModule,
  image: HTMLImageElement,
  metersPerPixel: number,
): RecognizedPlan {
  const src = cv.imread(image);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const lines = new cv.Mat();

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.Canny(blurred, edges, 50, 150, 3, false);
    cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 40, 40, 12);

    const walls: Wall[] = [];
    for (let i = 0; i < lines.rows; i++) {
      const x1 = lines.data32S[i * 4];
      const y1 = lines.data32S[i * 4 + 1];
      const x2 = lines.data32S[i * 4 + 2];
      const y2 = lines.data32S[i * 4 + 3];

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

    const loops = findClosedLoops(walls, 0.15);
    const rooms: Room[] = loops.map((points, i) => ({
      id: crypto.randomUUID(),
      name: `Stanza ${i + 1}`,
      points,
      floorMaterial: "wood-oak",
      source: "auto",
      confidence: 0.5,
    }));

    return { walls, rooms };
  } finally {
    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    lines.delete();
  }
}
