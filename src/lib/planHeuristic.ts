import type { RawSegment } from "./recognizePlan";

/**
 * Zero-dependency wall-line detector for the plan-recognition draft.
 *
 * OpenCV.js (an ~8-9MB WASM library) turned out to be unreliable in practice:
 * its threaded WASM runtime could block/freeze the tab on real devices even
 * after downscaling the image and enabling cross-origin isolation. This
 * heuristic replaces it with a plain scanline algorithm tuned for the kind of
 * input this feature actually gets - high-contrast technical/cadastral line
 * drawings (black lines on white) - rather than general noisy photography:
 *
 *   1. Grayscale + an automatic (Otsu) threshold to a dark/light bitmap.
 *   2. Scan rows for long, thin runs of dark pixels -> horizontal walls.
 *   3. Scan columns the same way -> vertical walls.
 *
 * It only finds axis-aligned segments (most floor plans are drawn that way),
 * runs in low tens of milliseconds even on a full-size canvas, and - like the
 * OpenCV path before it - is always treated as a draft the user corrects.
 */

function otsuThreshold(histogram: Uint32Array, totalPixels: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumBackground = 0;
  let weightBackground = 0;
  let bestThreshold = 128;
  let bestVariance = -1;

  for (let t = 0; t < 256; t++) {
    weightBackground += histogram[t];
    if (weightBackground === 0) continue;
    const weightForeground = totalPixels - weightBackground;
    if (weightForeground === 0) break;

    sumBackground += t * histogram[t];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;

    const betweenVariance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
    if (betweenVariance > bestVariance) {
      bestVariance = betweenVariance;
      bestThreshold = t;
    }
  }
  return bestThreshold;
}

interface Run {
  start: number;
  end: number;
}

/** Runs of "dark" pixels along one row of `isDark` (offset..offset+length), bridging small gaps. */
function extractRuns(isDark: Uint8Array, offset: number, length: number, gapTolerance: number, minLength: number): Run[] {
  const runs: Run[] = [];
  let start = -1;
  let lastDark = -1;
  for (let x = 0; x < length; x++) {
    if (isDark[offset + x]) {
      if (start === -1) start = x;
      lastDark = x;
    } else if (start !== -1 && x - lastDark > gapTolerance) {
      if (lastDark - start >= minLength) runs.push({ start, end: lastDark });
      start = -1;
    }
  }
  if (start !== -1 && lastDark - start >= minLength) runs.push({ start, end: lastDark });
  return runs;
}

interface Blob {
  rowStart: number;
  rowEnd: number;
  colMin: number;
  colMax: number;
}

function finalizeBlob(blob: Blob, minLength: number): { colMin: number; colMax: number; row: number } | null {
  const length = blob.colMax - blob.colMin;
  const thickness = blob.rowEnd - blob.rowStart + 1;
  if (length < minLength || thickness > Math.max(20, length * 0.3)) return null;
  return { colMin: blob.colMin, colMax: blob.colMax, row: Math.round((blob.rowStart + blob.rowEnd) / 2) };
}

/**
 * Scans a row-major bitmap for long thin horizontal runs of dark pixels,
 * merging matching runs on consecutive rows into single wall segments.
 * `rows`/`cols` describe `isDark`'s own layout (not necessarily image x/y -
 * the caller may pass a transposed bitmap to reuse this for vertical walls).
 */
function scanForHorizontalRuns(
  isDark: Uint8Array,
  cols: number,
  rows: number,
  minLength: number,
  gapTolerance: number,
): { colMin: number; colMax: number; row: number }[] {
  const results: { colMin: number; colMax: number; row: number }[] = [];
  let active: Blob[] = [];

  for (let row = 0; row < rows; row++) {
    const runs = extractRuns(isDark, row * cols, cols, gapTolerance, minLength);
    const used = new Array(runs.length).fill(false);
    const next: Blob[] = [];

    for (const blob of active) {
      let bestIdx = -1;
      let bestOverlap = 0;
      for (let i = 0; i < runs.length; i++) {
        if (used[i]) continue;
        const run = runs[i];
        const overlap = Math.min(blob.colMax, run.end) - Math.max(blob.colMin, run.start);
        const minSpan = Math.min(blob.colMax - blob.colMin, run.end - run.start) || 1;
        if (overlap > bestOverlap && overlap > 0.5 * minSpan) {
          bestOverlap = overlap;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        const run = runs[bestIdx];
        used[bestIdx] = true;
        blob.rowEnd = row;
        blob.colMin = Math.min(blob.colMin, run.start);
        blob.colMax = Math.max(blob.colMax, run.end);
        next.push(blob);
      } else {
        const finalized = finalizeBlob(blob, minLength);
        if (finalized) results.push(finalized);
      }
    }

    for (let i = 0; i < runs.length; i++) {
      if (!used[i]) next.push({ rowStart: row, rowEnd: row, colMin: runs[i].start, colMax: runs[i].end });
    }
    active = next;
  }
  for (const blob of active) {
    const finalized = finalizeBlob(blob, minLength);
    if (finalized) results.push(finalized);
  }
  return results;
}

function transpose(isDark: Uint8Array, width: number, height: number): Uint8Array {
  const t = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      t[x * height + y] = isDark[y * width + x];
    }
  }
  return t;
}

export function extractWallSegmentsHeuristic(imageData: ImageData): RawSegment[] {
  const { width, height, data } = imageData;
  const pixelCount = width * height;
  const gray = new Uint8ClampedArray(pixelCount);
  const histogram = new Uint32Array(256);

  for (let i = 0, p = 0; p < pixelCount; i += 4, p++) {
    const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    gray[p] = lum;
    histogram[lum]++;
  }

  const threshold = otsuThreshold(histogram, pixelCount);
  const isDark = new Uint8Array(pixelCount);
  for (let p = 0; p < pixelCount; p++) isDark[p] = gray[p] < threshold ? 1 : 0;

  const minLength = Math.max(15, Math.round(Math.min(width, height) * 0.02));
  const gapTolerance = 2;

  const horizontal = scanForHorizontalRuns(isDark, width, height, minLength, gapTolerance).map(
    (r): RawSegment => ({ x1: r.colMin, y1: r.row, x2: r.colMax, y2: r.row }),
  );

  const transposed = transpose(isDark, width, height);
  const vertical = scanForHorizontalRuns(transposed, height, width, minLength, gapTolerance).map(
    (r): RawSegment => ({ x1: r.row, y1: r.colMin, x2: r.row, y2: r.colMax }),
  );

  return [...horizontal, ...vertical];
}
