"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperProps {
  imageSrc: string;
  onApply: (dataUrl: string, width: number, height: number) => void;
  onCancel: () => void;
}

const BASE_WIDTH = 640;
const MIN_CROP_FRACTION = 0.05;

type HandleId = "move" | "nw" | "ne" | "sw" | "se";

function clampCrop(c: CropRect): CropRect {
  const width = Math.max(MIN_CROP_FRACTION, Math.min(1, c.width));
  const height = Math.max(MIN_CROP_FRACTION, Math.min(1, c.height));
  const x = Math.max(0, Math.min(1 - width, c.x));
  const y = Math.max(0, Math.min(1 - height, c.y));
  return { x, y, width, height };
}

export default function ImageCropper({ imageSrc, onApply, onCancel }: ImageCropperProps) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 1, height: 1 });
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{ handle: HandleId; start: CropRect; startX: number; startY: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = imageSrc;
  }, [imageSrc]);

  if (!naturalSize) {
    return <p className="text-sm text-neutral-500">Caricamento immagine...</p>;
  }

  const baseWidth = BASE_WIDTH;
  const baseHeight = (naturalSize.height / naturalSize.width) * BASE_WIDTH;
  const displayWidth = baseWidth * zoom;
  const displayHeight = baseHeight * zoom;

  function handlePointerDown(handle: HandleId, e: ReactPointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { handle, start: crop, startX: e.clientX, startY: e.clientY };
  }

  function handlePointerMove(e: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    // Deltas are computed from the absolute pointer position relative to
    // where the drag started (not e.movementX/Y), since movementX/Y isn't
    // reliably populated for every pointermove across input devices/browsers.
    const dxNorm = (e.clientX - drag.startX) / zoom / baseWidth;
    const dyNorm = (e.clientY - drag.startY) / zoom / baseHeight;
    const s = drag.start;

    if (drag.handle === "move") {
      setCrop(clampCrop({ ...s, x: s.x + dxNorm, y: s.y + dyNorm }));
      return;
    }
    let { x, y, width, height } = s;
    if (drag.handle.includes("w")) {
      x = s.x + dxNorm;
      width = s.width - dxNorm;
    }
    if (drag.handle.includes("e")) {
      width = s.width + dxNorm;
    }
    if (drag.handle.includes("n")) {
      y = s.y + dyNorm;
      height = s.height - dyNorm;
    }
    if (drag.handle.includes("s")) {
      height = s.height + dyNorm;
    }
    setCrop(clampCrop({ x, y, width, height }));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleApply() {
    if (!naturalSize) return;
    const { width: naturalWidth, height: naturalHeight } = naturalSize;
    const img = new Image();
    img.onload = () => {
      const sx = Math.round(crop.x * naturalWidth);
      const sy = Math.round(crop.y * naturalHeight);
      const sw = Math.round(crop.width * naturalWidth);
      const sh = Math.round(crop.height * naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, sw);
      canvas.height = Math.max(1, sh);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      onApply(canvas.toDataURL("image/jpeg", 0.9), canvas.width, canvas.height);
    };
    img.src = imageSrc;
  }

  const isFullCrop = crop.x === 0 && crop.y === 0 && crop.width === 1 && crop.height === 1;
  const handleStyle = "absolute h-3 w-3 rounded-full border-2 border-white bg-blue-600";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="flex flex-1 items-center gap-2 text-xs text-neutral-400">
          Zoom
          <input
            type="range"
            min={1}
            max={4}
            step={0.25}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="w-10 text-right">{zoom.toFixed(2)}x</span>
        </label>
        <button
          onClick={() => setCrop({ x: 0, y: 0, width: 1, height: 1 })}
          disabled={isFullCrop}
          className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-40"
        >
          Reimposta selezione
        </button>
      </div>

      <div
        className="relative overflow-auto rounded-lg border border-neutral-700 bg-neutral-950"
        style={{ maxHeight: 420 }}
      >
        <div
          className="relative"
          style={{ width: displayWidth, height: displayHeight }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt="Planimetria da ritagliare"
            draggable={false}
            className="pointer-events-none block select-none"
            style={{ width: displayWidth, height: displayHeight }}
          />

          {/* dim area outside the crop selection */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ boxShadow: `0 0 0 9999px rgba(0,0,0,0.55)`, clipPath: "inset(0)" }}
          />
          <div
            className="absolute cursor-move border-2 border-blue-500"
            style={{
              left: crop.x * displayWidth,
              top: crop.y * displayHeight,
              width: crop.width * displayWidth,
              height: crop.height * displayHeight,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            }}
            onPointerDown={(e) => handlePointerDown("move", e)}
          >
            {(["nw", "ne", "sw", "se"] as const).map((corner) => (
              <div
                key={corner}
                onPointerDown={(e) => handlePointerDown(corner, e)}
                className={handleStyle}
                style={{
                  cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
                  left: corner.includes("w") ? -6 : undefined,
                  right: corner.includes("e") ? -6 : undefined,
                  top: corner.includes("n") ? -6 : undefined,
                  bottom: corner.includes("s") ? -6 : undefined,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          Annulla
        </button>
        <button
          onClick={handleApply}
          disabled={isFullCrop}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40"
          title={isFullCrop ? "Seleziona un'area più piccola per ritagliare" : undefined}
        >
          Applica ritaglio
        </button>
      </div>
    </div>
  );
}
