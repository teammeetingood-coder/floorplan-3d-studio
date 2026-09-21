export interface WallOpeningRef {
  offset: number;
  width: number;
  sill: number;
  height: number;
}

export interface WallSegment3D {
  start: number;
  end: number;
  yFrom: number;
  yTo: number;
}

/**
 * Splits a wall's length into solid rectangular segments (offset-along-wall x height),
 * carving out door/window openings. Assumes openings on the same wall don't overlap.
 */
export function buildWallSegments(
  wallLen: number,
  openings: WallOpeningRef[],
  wallHeight: number,
): WallSegment3D[] {
  const segments: WallSegment3D[] = [];
  const cuts = openings
    .map((o) => ({
      start: Math.max(0, o.offset - o.width / 2),
      end: Math.min(wallLen, o.offset + o.width / 2),
      sill: o.sill,
      top: o.sill + o.height,
    }))
    .sort((a, b) => a.start - b.start);

  let cursor = 0;
  for (const cut of cuts) {
    if (cut.start > cursor) {
      segments.push({ start: cursor, end: cut.start, yFrom: 0, yTo: wallHeight });
    }
    if (cut.sill > 0) {
      segments.push({ start: cut.start, end: cut.end, yFrom: 0, yTo: Math.min(cut.sill, wallHeight) });
    }
    if (cut.top < wallHeight) {
      segments.push({
        start: cut.start,
        end: cut.end,
        yFrom: Math.max(cut.top, 0),
        yTo: wallHeight,
      });
    }
    cursor = Math.max(cursor, cut.end);
  }
  if (cursor < wallLen - 1e-6) {
    segments.push({ start: cursor, end: wallLen, yFrom: 0, yTo: wallHeight });
  }

  return segments.filter((s) => s.end - s.start > 1e-4 && s.yTo - s.yFrom > 1e-4);
}
