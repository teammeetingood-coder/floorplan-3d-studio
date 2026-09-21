"use client";

import { useMemo } from "react";
import { useProjectStore } from "@/lib/store";
import { FURNITURE_CATALOG, getCatalogItem } from "@/lib/furnitureCatalog";

interface FurniturePanelProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function FurniturePanel({ selectedId, onSelect }: FurniturePanelProps) {
  const furniture = useProjectStore((s) => s.project.furniture);
  const addFurniture = useProjectStore((s) => s.addFurniture);
  const updateFurniture = useProjectStore((s) => s.updateFurniture);
  const removeFurniture = useProjectStore((s) => s.removeFurniture);

  const selected = furniture.find((f) => f.id === selectedId) ?? null;

  const categories = useMemo(() => {
    const map = new Map<string, typeof FURNITURE_CATALOG>();
    for (const item of FURNITURE_CATALOG) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries());
  }, []);

  function handleAdd(catalogId: string) {
    const offset = (furniture.length % 6) * 0.3;
    const id = addFurniture({ catalogId, x: offset, y: offset, rotation: 0, scale: 1 });
    onSelect(id);
  }

  return (
    <div className="flex h-full w-72 flex-col border-l border-neutral-800 bg-neutral-900">
      <div className="border-b border-neutral-800 p-3">
        <h2 className="text-sm font-semibold text-neutral-200">Libreria arredi</h2>
        <p className="text-xs text-neutral-500">Clicca per aggiungere, poi trascina in scena.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {categories.map(([category, items]) => (
          <div key={category} className="mb-4">
            <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
              {category}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAdd(item.id)}
                  className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-2 text-left text-xs text-neutral-200 hover:border-blue-500 hover:bg-neutral-750"
                  style={{ borderLeftColor: item.color, borderLeftWidth: 3 }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="border-t border-neutral-800 p-3">
          <h3 className="mb-2 text-sm font-semibold text-neutral-200">
            {getCatalogItem(selected.catalogId).label}
          </h3>
          <label className="mb-2 block text-xs text-neutral-400">
            Rotazione ({Math.round((selected.rotation * 180) / Math.PI)}°)
            <input
              type="range"
              min={-180}
              max={180}
              step={5}
              value={(selected.rotation * 180) / Math.PI}
              onChange={(e) =>
                updateFurniture(selected.id, { rotation: (parseFloat(e.target.value) * Math.PI) / 180 })
              }
              className="mt-1 w-full"
            />
          </label>
          <label className="mb-3 block text-xs text-neutral-400">
            Scala ({selected.scale.toFixed(2)}x)
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={selected.scale}
              onChange={(e) => updateFurniture(selected.id, { scale: parseFloat(e.target.value) })}
              className="mt-1 w-full"
            />
          </label>
          <button
            onClick={() => {
              removeFurniture(selected.id);
              onSelect(null);
            }}
            className="w-full rounded-md bg-red-950 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900"
          >
            Elimina arredo
          </button>
        </div>
      )}
    </div>
  );
}
