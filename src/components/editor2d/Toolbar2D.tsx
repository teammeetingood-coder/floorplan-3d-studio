"use client";

import type { Tool } from "./constants";

interface Toolbar2DProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  onDetectRooms: () => void;
  needsReview: boolean;
  onAcceptReview: () => void;
  onDiscardReview: () => void;
  hasReferenceImage: boolean;
  referenceVisible: boolean;
  onToggleReferenceVisible: () => void;
  referenceOpacity: number;
  onReferenceOpacityChange: (opacity: number) => void;
  onRemoveReference: () => void;
}

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: "select", label: "Seleziona", hint: "V" },
  { id: "wall", label: "Muro", hint: "W" },
  { id: "room", label: "Stanza", hint: "R" },
  { id: "door", label: "Porta", hint: "D" },
  { id: "window", label: "Finestra", hint: "F" },
];

export default function Toolbar2D({
  tool,
  onToolChange,
  onDeleteSelected,
  hasSelection,
  onDetectRooms,
  needsReview,
  onAcceptReview,
  onDiscardReview,
  hasReferenceImage,
  referenceVisible,
  onToggleReferenceVisible,
  referenceOpacity,
  onReferenceOpacityChange,
  onRemoveReference,
}: Toolbar2DProps) {
  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
      <div className="flex gap-1 rounded-lg border border-neutral-700 bg-neutral-900/95 p-1 shadow-lg">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => onToolChange(t.id)}
            title={`${t.label} (${t.hint})`}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              tool === t.id
                ? "bg-blue-600 text-white"
                : "text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="mx-1 w-px bg-neutral-700" />
        <button
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          className="rounded-md px-3 py-2 text-sm text-red-400 hover:bg-red-950 disabled:opacity-30"
          title="Elimina selezione (Canc)"
        >
          Elimina
        </button>
        <button
          onClick={onDetectRooms}
          className="rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          title="Trova automaticamente le stanze chiuse dai muri disegnati"
        >
          Rileva stanze da muri
        </button>
      </div>

      {needsReview && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-800 bg-amber-950/95 px-3 py-2 shadow-lg">
          <span className="text-sm text-amber-300">
            Bozza dal riconoscimento automatico: correggi muri e stanze prima
            di generare il 3D.
          </span>
          <button
            onClick={onAcceptReview}
            className="rounded-md bg-amber-600 px-3 py-1 text-sm font-medium text-white hover:bg-amber-500"
          >
            Ho corretto, conferma
          </button>
          <button
            onClick={onDiscardReview}
            className="rounded-md border border-amber-700 px-3 py-1 text-sm text-amber-300 hover:bg-amber-900"
          >
            Scarta bozza
          </button>
        </div>
      )}

      {hasReferenceImage && (
        <div className="flex items-center gap-3 rounded-lg border border-neutral-700 bg-neutral-900/95 px-3 py-2 shadow-lg">
          <label className="flex items-center gap-1.5 text-sm text-neutral-300">
            <input type="checkbox" checked={referenceVisible} onChange={onToggleReferenceVisible} />
            Immagine di riferimento
          </label>
          <label className="flex items-center gap-1.5 text-xs text-neutral-400">
            Opacità
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={referenceOpacity}
              disabled={!referenceVisible}
              onChange={(e) => onReferenceOpacityChange(parseFloat(e.target.value))}
              className="w-24"
            />
          </label>
          <button
            onClick={onRemoveReference}
            className="rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-red-400"
          >
            Rimuovi
          </button>
        </div>
      )}
    </div>
  );
}
