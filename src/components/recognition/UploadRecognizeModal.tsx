"use client";

import { useRef, useState } from "react";
import { useProjectStore } from "@/lib/store";
import { loadOpenCv } from "@/lib/opencvLoader";
import { recognizePlanFromImage } from "@/lib/recognizePlan";

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
  const [realWidthM, setRealWidthM] = useState(10);
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
      const metersPerPixel = realWidthM / imageSize.width;
      const { walls, rooms } = recognizePlanFromImage(cv, imgRef.current, metersPerPixel);
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
              Larghezza reale dell&apos;immagine (m) — usata per convertire i pixel in metri
              <input
                type="number"
                min={1}
                max={100}
                step={0.5}
                value={realWidthM}
                onChange={(e) => setRealWidthM(parseFloat(e.target.value) || 10)}
                className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
              />
              <span className="mt-1 block text-xs text-neutral-500">
                Immagine: {imageSize.width}×{imageSize.height}px. Se non conosci la
                misura esatta, stima la larghezza reale della pianta: la precisione
                non è critica, potrai correggere tutto a mano.
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
                  {status === "loading-cv" && "Caricamento OpenCV.js..."}
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
