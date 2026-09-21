"use client";

import type { Opening, Room, Wall } from "@/lib/types";
import { FLOOR_MATERIALS } from "@/lib/materials";
import { wallLength } from "@/lib/geometry";

type Selection =
  | { type: "wall"; element: Wall }
  | { type: "room"; element: Room }
  | { type: "opening"; element: Opening }
  | null;

interface PropertiesPanelProps {
  selection: Selection;
  onUpdateWall: (patch: Partial<Wall>) => void;
  onUpdateRoom: (patch: Partial<Room>) => void;
  onUpdateOpening: (patch: Partial<Opening>) => void;
}

export default function PropertiesPanel({
  selection,
  onUpdateWall,
  onUpdateRoom,
  onUpdateOpening,
}: PropertiesPanelProps) {
  if (!selection) return null;

  return (
    <div className="absolute right-3 top-3 z-10 w-64 rounded-lg border border-neutral-700 bg-neutral-900/95 p-4 shadow-lg">
      {selection.type === "wall" && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-200">Muro</h3>
          <Field label={`Lunghezza: ${wallLength(selection.element).toFixed(2)} m`} />
          <NumberField
            label="Spessore (m)"
            value={selection.element.thickness}
            step={0.01}
            min={0.05}
            max={0.6}
            onChange={(v) => onUpdateWall({ thickness: v })}
          />
        </div>
      )}

      {selection.type === "room" && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-200">Stanza</h3>
          <label className="block text-xs text-neutral-400">
            Nome
            <input
              value={selection.element.name}
              onChange={(e) => onUpdateRoom({ name: e.target.value })}
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-100"
            />
          </label>
          <label className="block text-xs text-neutral-400">
            Pavimento
            <select
              value={selection.element.floorMaterial}
              onChange={(e) => onUpdateRoom({ floorMaterial: e.target.value })}
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-100"
            >
              {FLOOR_MATERIALS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {selection.type === "opening" && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-200">
            {selection.element.type === "door" ? "Porta" : "Finestra"}
          </h3>
          <NumberField
            label="Larghezza (m)"
            value={selection.element.width}
            step={0.05}
            min={0.4}
            max={3}
            onChange={(v) => onUpdateOpening({ width: v })}
          />
          <NumberField
            label="Altezza (m)"
            value={selection.element.height}
            step={0.05}
            min={0.4}
            max={2.5}
            onChange={(v) => onUpdateOpening({ height: v })}
          />
          <NumberField
            label="Altezza dal pavimento (m)"
            value={selection.element.sill}
            step={0.05}
            min={0}
            max={2}
            onChange={(v) => onUpdateOpening({ sill: v })}
          />
        </div>
      )}
    </div>
  );
}

function Field({ label }: { label: string }) {
  return <p className="text-xs text-neutral-400">{label}</p>;
}

function NumberField({
  label,
  value,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-xs text-neutral-400">
      {label}
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-100"
      />
    </label>
  );
}
