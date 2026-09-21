"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useProjectStore } from "@/lib/store";
import UploadRecognizeModal from "@/components/recognition/UploadRecognizeModal";

const Editor2D = dynamic(() => import("@/components/editor2d/Editor2D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-neutral-500">
      Caricamento editor 2D...
    </div>
  ),
});

const Viewer3D = dynamic(() => import("@/components/viewer3d/Viewer3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-neutral-500">
      Caricamento vista 3D...
    </div>
  ),
});

type Mode = "2d" | "3d";

export default function EditorShell() {
  const router = useRouter();
  const project = useProjectStore((s) => s.project);
  const renameProject = useProjectStore((s) => s.renameProject);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);
  const setWallHeight = useProjectStore((s) => s.setWallHeight);
  const setGridSize = useProjectStore((s) => s.setGridSize);
  const needsReview = useProjectStore((s) => s.project.needsReview);

  const [mode, setMode] = useState<Mode>("2d");
  const [showUpload, setShowUpload] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="flex items-center gap-3 border-b border-neutral-800 bg-neutral-900 px-4 py-2">
        <button
          onClick={() => router.push("/")}
          className="rounded-md px-2 py-1 text-sm text-neutral-400 hover:bg-neutral-800"
          title="Torna alla home"
        >
          ← Progetti
        </button>

        <input
          ref={nameInputRef}
          defaultValue={project.name}
          onBlur={(e) => renameProject(e.target.value || "Senza nome")}
          className="w-48 rounded-md bg-transparent px-2 py-1 text-sm font-medium outline-none focus:bg-neutral-800"
        />

        <div className="ml-2 flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="rounded-md px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
            title="Annulla (Ctrl+Z)"
          >
            ↶ Annulla
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="rounded-md px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
            title="Ripeti (Ctrl+Y)"
          >
            ↷ Ripeti
          </button>
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="ml-2 rounded-md border border-neutral-700 px-3 py-1 text-sm text-neutral-200 hover:bg-neutral-800"
        >
          Carica planimetria...
        </button>

        {needsReview && (
          <span className="rounded-full bg-amber-950 px-3 py-1 text-xs font-medium text-amber-400">
            Bozza da correggere: rivedi muri e stanze prima del 3D
          </span>
        )}

        <div className="flex-1" />

        {mode === "2d" && (
          <label className="flex items-center gap-2 text-sm text-neutral-400">
            Precisione
            <select
              value={project.gridSize}
              onChange={(e) => setGridSize(parseFloat(e.target.value))}
              title="Passo dello snap durante il disegno: usa un valore più piccolo (o Nessuno) per ricalcare un'immagine di riferimento con precisione"
              className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
            >
              <option value={0}>Libera (no snap)</option>
              <option value={0.02}>2 cm</option>
              <option value={0.05}>5 cm</option>
              <option value={0.1}>10 cm</option>
              <option value={0.25}>25 cm</option>
              <option value={0.5}>50 cm</option>
              <option value={1}>1 m</option>
            </select>
          </label>
        )}

        <label className="flex items-center gap-2 text-sm text-neutral-400">
          Altezza muri (m)
          <input
            type="number"
            step={0.1}
            min={2}
            max={5}
            value={project.wallHeight}
            onChange={(e) => setWallHeight(parseFloat(e.target.value) || 2.7)}
            className="w-16 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
          />
        </label>

        <div className="ml-2 flex rounded-md border border-neutral-700 p-0.5">
          <button
            onClick={() => setMode("2d")}
            className={`rounded px-3 py-1 text-sm ${
              mode === "2d" ? "bg-blue-600 text-white" : "text-neutral-300"
            }`}
          >
            Pianta 2D
          </button>
          <button
            onClick={() => setMode("3d")}
            title="Gli arredi si aggiungono da qui: pannello 'Arredi' sulla destra della vista 3D"
            className={`rounded px-3 py-1 text-sm ${
              mode === "3d" ? "bg-blue-600 text-white" : "text-neutral-300"
            }`}
          >
            Vista 3D
          </button>
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        {/* Only one of Editor2D / Viewer3D is mounted at a time: Viewer3D drives its
            own react-three-fiber reconciler, and keeping both trees mounted (e.g. via
            CSS display:none) caused conflicts, so we unmount the inactive one instead. */}
        {mode === "2d" && (
          <div className="h-full">
            <Editor2D />
          </div>
        )}
        {mode === "3d" && (
          <div className="h-full">
            <Viewer3D />
          </div>
        )}
      </div>

      {showUpload && (
        <UploadRecognizeModal
          onClose={() => setShowUpload(false)}
          onApplied={() => {
            setShowUpload(false);
            setMode("2d");
          }}
        />
      )}
    </div>
  );
}
