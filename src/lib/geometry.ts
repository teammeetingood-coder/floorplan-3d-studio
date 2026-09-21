import type { Point, Wall } from "./types";

export function snapValue(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

export function snapPoint(p: Point, gridSize: number): Point {
  return { x: snapValue(p.x, gridSize), y: snapValue(p.y, gridSize) };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function wallLength(wall: Wall): number {
  return distance(wall.a, wall.b);
}

export function wallAngle(wall: Wall): number {
  return Math.atan2(wall.b.y - wall.a.y, wall.b.x - wall.a.x);
}

/** Point along a wall at a given distance from `a`, plus the wall's unit normal. */
export function pointOnWall(wall: Wall, offset: number): { point: Point; normal: Point } {
  const len = wallLength(wall) || 1;
  const t = offset / len;
  const dx = wall.b.x - wall.a.x;
  const dy = wall.b.y - wall.a.y;
  const point = { x: wall.a.x + dx * t, y: wall.a.y + dy * t };
  const normal = { x: -dy / len, y: dx / len };
  return { point, normal };
}

/** Snaps a free point to the nearest wall endpoint within `tolerance`, else returns the grid-snapped point. */
export function snapToNearestEndpoint(
  p: Point,
  walls: Wall[],
  tolerance: number,
): Point | null {
  let best: Point | null = null;
  let bestDist = tolerance;
  for (const wall of walls) {
    for (const endpoint of [wall.a, wall.b]) {
      const d = distance(p, endpoint);
      if (d <= bestDist) {
        bestDist = d;
        best = endpoint;
      }
    }
  }
  return best;
}

export function polygonArea(points: Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

export function polygonCentroid(points: Point[]): Point {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

export function pointInPolygon(p: Point, points: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Distance from point p to the segment ab, plus the closest point on the segment. */
export function distanceToSegment(
  p: Point,
  a: Point,
  b: Point,
): { distance: number; closest: Point; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closest = { x: a.x + dx * t, y: a.y + dy * t };
  return { distance: distance(p, closest), closest, t };
}

/**
 * Attempts to trace closed loops of walls (by shared endpoints, within `tolerance`)
 * and returns their polygons. Used to auto-suggest rooms from a wall network.
 */
export function findClosedLoops(walls: Wall[], tolerance = 0.05): Point[][] {
  type Node = { point: Point; edges: number[] };
  const nodes: Node[] = [];

  function findNode(p: Point): number {
    for (let i = 0; i < nodes.length; i++) {
      if (distance(nodes[i].point, p) <= tolerance) return i;
    }
    nodes.push({ point: p, edges: [] });
    return nodes.length - 1;
  }

  const edges: [number, number][] = [];
  walls.forEach((wall, idx) => {
    const ia = findNode(wall.a);
    const ib = findNode(wall.b);
    edges.push([ia, ib]);
    nodes[ia].edges.push(idx);
    nodes[ib].edges.push(idx);
  });

  // Build adjacency: node -> list of {edgeIdx, otherNode}
  const adjacency = new Map<number, { edge: number; other: number }[]>();
  edges.forEach(([ia, ib], edgeIdx) => {
    if (!adjacency.has(ia)) adjacency.set(ia, []);
    if (!adjacency.has(ib)) adjacency.set(ib, []);
    adjacency.get(ia)!.push({ edge: edgeIdx, other: ib });
    adjacency.get(ib)!.push({ edge: edgeIdx, other: ia });
  });

  const usedDirected = new Set<string>();
  const loops: Point[][] = [];

  // Walk each directed edge once, always turning to the most clockwise option,
  // which traces the boundary of every minimal face in a planar graph.
  edges.forEach(([ia, ib], edgeIdx) => {
    for (const [from, to] of [
      [ia, ib],
      [ib, ia],
    ] as [number, number][]) {
      const key = `${from}->${to}:${edgeIdx}`;
      if (usedDirected.has(key)) continue;

      const loopPoints: Point[] = [];
      let curFrom = from;
      let curTo = to;
      let curEdge = edgeIdx;
      let safety = 0;
      // A real room never needs more than a few dozen edges; capping this
      // low keeps a single traversal cheap even on messy/noisy wall graphs
      // (e.g. duplicate near-parallel segments from auto-recognition).
      while (safety++ < 40) {
        const dirKey = `${curFrom}->${curTo}:${curEdge}`;
        if (usedDirected.has(dirKey)) break;
        usedDirected.add(dirKey);
        loopPoints.push(nodes[curTo].point);

        const incoming = {
          x: nodes[curTo].point.x - nodes[curFrom].point.x,
          y: nodes[curTo].point.y - nodes[curFrom].point.y,
        };
        const options = (adjacency.get(curTo) ?? []).filter(
          (o) => !(o.edge === curEdge),
        );
        if (options.length === 0) break;

        let bestOpt = options[0];
        let bestAngle = -Infinity;
        for (const opt of options) {
          const outgoing = {
            x: nodes[opt.other].point.x - nodes[curTo].point.x,
            y: nodes[opt.other].point.y - nodes[curTo].point.y,
          };
          const angle = Math.atan2(
            incoming.x * outgoing.y - incoming.y * outgoing.x,
            incoming.x * outgoing.x + incoming.y * outgoing.y,
          );
          // pick the most clockwise turn (smallest positive turn angle)
          const normalized = angle <= 0 ? angle + 2 * Math.PI : angle;
          if (normalized > bestAngle) {
            bestAngle = normalized;
            bestOpt = opt;
          }
        }

        if (curTo === from && loopPoints.length > 2) break;
        curFrom = curTo;
        curTo = bestOpt.other;
        curEdge = bestOpt.edge;
      }

      if (loopPoints.length >= 3) {
        const area = polygonArea(loopPoints);
        // keep only clockwise-bounded minimal faces (positive small area, not the outer face)
        if (area > tolerance * tolerance) {
          loops.push(loopPoints);
        }
      }
    }
  });

  // De-duplicate loops that describe the same polygon (same point set, any
  // rotation). Each loop's key is computed once and looked up in a Set, so
  // this stays O(n log n) instead of re-sorting every existing loop against
  // every candidate.
  const seenKeys = new Set<string>();
  const unique: Point[][] = [];
  for (const loop of loops) {
    const key = [...loop]
      .sort((a, b) => a.x - b.x || a.y - b.y)
      .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join("|");
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      unique.push(loop);
    }
  }
  return unique;
}
