"use client";

import { useRef, useState } from "react";
import { useProjectStore } from "@/lib/store";
import { extractWallSegmentsHeuristic } from "@/lib/planHeuristic";
import { buildWallsFromSegments, metersPerPixelFromArea, resizeImageForProcessing } from "@/lib/recognizePlan";

interface UploadRecognizeModalProps {
  onClose: () => void;
  onApplied: () => void;
}

type Status = "idle" | "reading-file" | "analyzing" | "done" | "error";

// Scanned documents/plans are often huge (a 300-600dpi scan can be 5000-8000px+).
// Decoding one straight into a base64 <img src> and holding it at full size can
// exhaust the tab's memory and crash it before OpenCV even gets involved, so the
// very first thing we do with any uploaded file is downscale it onto a canvas.
const MAX_PREVIEW_DIMENSION_PX = 1600;

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

  async function handleFile(file: File) {
    setError(null);
    setStatus("reading-file");
    try {
      // createImageBitmap decodes directly from the file/blob (no giant base64
      // string of the original), and we immediately draw it down to a capped
      // size before ever holding a full-resolution copy in memory.
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX_PREVIEW_DIMENSION_PX / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Impossibile leggere questa immagine");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();

      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setImageSize({ width: canvas.width, height: canvas.height });
      setImageSrc(dataUrl);
      setStatus("idle");
      setResult(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Impossibile leggere questa immagine: ${err.message}`
          : "Impossibile leggere questa immagine.",
      );
      setStatus("error");
    }
  }

  async function handleAnalyze() {
    if (!imgRef.current || !imageSrc) return;
    setError(null);
    setStatus("analyzing");
    // Let React actually paint the "Analisi in corso" state before the
    // (brief, but synchronous) detection pass below runs.
    await new Promise((resolve) => setTimeout(resolve, 30));
    try {
      const canvas = resizeImageForProcessing(imgRef.current);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Impossibile leggere l'immagine caricata");
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const segments = extractWallSegmentsHeuristic(imageData);
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
          Il riconoscimento automatico (rilevamento bordi, elaborato interamente
          nel browser) produce sempre una <strong>bozza da correggere</strong>,
          mai un risultato definitivo: i muri poco affidabili appariranno
          tratteggiati e più trasparenti nell&apos;editor 2D. Funziona meglio su
          disegni tecnici ad alto contrasto (scansioni, planimetrie in bianco e
          nero) che su foto.
        </p>

        {!imageSrc && status !== "reading-file" && (
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

        {!imageSrc && status === "reading-file" && (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-700 p-10 text-neutral-400">
            Caricamento immagine...
          </div>
        )}

        {!imageSrc && status === "error" && error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
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
                  disabled={status === "analyzing"}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
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
