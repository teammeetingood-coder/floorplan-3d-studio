"use client";

import { useRef, useState } from "react";
import { useProjectStore } from "@/lib/store";
import { loadOpenCv } from "@/lib/opencvLoader";
import { buildWallsFromSegments, detectSegments, metersPerPixelFromArea, resizeImageForProcessing } from "@/lib/recognizePlan";

interface UploadRecognizeModalProps {
  onClose: () => void;
  onApplied: () => void;
}

type Status = "idle" | "loading-cv" | "analyzing" | "done" | "error";

export default function UploadRecognizeModal({ onClose, onApplied }: UploadRecognizeModalProps) {
  const applyRecognitionResult = useProjectStore((s) => s.applyRecognitionResult);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [areaM2, setAreaM2] = useState(70);
  const [result, setResult] = useState<{ walls: number; rooms: number } | null>(null);
  const pendingResult = useRef<{ walls: import("@/lib/types").Wall[]; rooms: import("@/lib/types").Room[] } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
        setImageSrc(dataUrl);
        setStatus("idle");
        setResult(null);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (!imgRef.current || !imageSrc) return;
    setError(null);
    setStatus("loading-cv");
    try {
      const cv = await loadOpenCv();
      setStatus("analyzing");
      // Let React actually paint the "Analisi in corso" state before the
      // synchronous OpenCV work below runs. The image is downscaled first
      // (resizeImageForProcessing), which keeps that work well under a
      // second even for a full-resolution phone photo.
      await new Promise((resolve) => setTimeout(resolve, 30));

      const canvas = resizeImageForProcessing(imgRef.current);
      const segments = detectSegments(cv, canvas);
      const metersPerPixel = metersPerPixelFromArea(areaM2, canvas.width, canvas.height);
      const { walls, rooms } = buildWallsFromSegments(segments, metersPerPixel);
      pendingResult.current = { walls, rooms };
      setResult({ walls: walls.length, rooms: rooms.length });
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'analisi dell'immagine");
      setStatus("error");
    }
  }

  function handleApply() {
    if (!pendingResult.current || !imageSrc) return;
    applyRecognitionResult(pendingResult.current.walls, pendingResult.current.rooms, {
      dataUrl: imageSrc,
      width: imageSize.width,
      height: imageSize.height,
    });
    onApplied();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-neutral-700 bg-neutral-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-100">Carica planimetria</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300">
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-neutral-400">
          Il riconoscimento automatico (edge detection con OpenCV.js) produce sempre
          una <strong>bozza da correggere</strong>, mai un risultato definitivo: i muri
          poco affidabili appariranno tratteggiati e più trasparenti nell&apos;editor 2D.
        </p>

        {!imageSrc && (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-700 p-10 text-neutral-500 hover:border-neutral-500">
            <span>Clicca per scegliere un&apos;immagine (foto o scan della planimetria)</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        )}

        {imageSrc && (
          <div className="space-y-4">
            <div className="max-h-72 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={imgRef} src={imageSrc} alt="Planimetria caricata" className="w-full object-contain" />
            </div>

            <label className="block text-sm text-neutral-300">
              Superficie della planimetria (mq)
              <input
                type="number"
                min={5}
                max={2000}
                step={1}
                value={areaM2}
                onChange={(e) => setAreaM2(parseFloat(e.target.value) || 70)}
                className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
              />
              <span className="mt-1 block text-xs text-neutral-500">
                Basta il totale in mq: la scala pixel→metri viene stimata da
                questo dato assumendo che la pianta riempia l&apos;immagine.
                Non serve precisione, correggerai tutto a mano dopo.
              </span>
            </label>

            {status === "error" && <p className="text-sm text-red-400">{error}</p>}

            {status === "done" && result && (
              <p className="rounded-md bg-emerald-950 px-3 py-2 text-sm text-emerald-400">
                Trovati {result.walls} muri e {result.rooms} stanze candidate. Applica la
                bozza e correggila nell&apos;editor 2D.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setImageSrc(null);
                  setResult(null);
                  setStatus("idle");
                }}
                className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
              >
                Cambia immagine
              </button>
              {status !== "done" && (
                <button
                  onClick={handleAnalyze}
                  disabled={status === "loading-cv" || status === "analyzing"}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {status === "loading-cv" && "Caricamento OpenCV.js (prima volta, qualche secondo)..."}
                  {status === "analyzing" && "Analisi in corso..."}
                  {(status === "idle" || status === "error") && "Analizza planimetria"}
                </button>
              )}
              {status === "done" && (
                <button
                  onClick={handleApply}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Applica come bozza nell&apos;editor 2D
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
