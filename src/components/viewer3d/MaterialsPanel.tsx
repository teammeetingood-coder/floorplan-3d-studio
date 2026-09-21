"use client";

import { useProjectStore } from "@/lib/store";
import { FLOOR_MATERIALS, WALL_MATERIALS } from "@/lib/materials";

export default function MaterialsPanel() {
  const project = useProjectStore((s) => s.project);
  const setWallMaterial = useProjectStore((s) => s.setWallMaterial);
  const setRoomFloorMaterial = useProjectStore((s) => s.setRoomFloorMaterial);

  return (
    <div className="flex h-full w-72 flex-col border-l border-neutral-800 bg-neutral-900 p-3">
      <h2 className="mb-1 text-sm font-semibold text-neutral-200">Materiali</h2>

      <section className="mt-2">
        <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Pareti (globale)
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {WALL_MATERIALS.map((m) => (
            <button
              key={m.id}
              onClick={() => setWallMaterial(m.id)}
              className={`rounded-md border px-2 py-2 text-left text-xs ${
                project.wallMaterial === m.id
                  ? "border-blue-500 bg-neutral-800 text-white"
                  : "border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-500"
              }`}
            >
              <span
                className="mb-1 block h-4 w-full rounded"
                style={{ backgroundColor: m.color }}
              />
              {m.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 flex-1 overflow-y-auto">
        <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Pavimenti per stanza
        </h3>
        {project.rooms.length === 0 && (
          <p className="text-xs text-neutral-500">
            Nessuna stanza definita. Disegnala nell&apos;editor 2D.
          </p>
        )}
        <div className="space-y-3">
          {project.rooms.map((room) => (
            <div key={room.id}>
              <p className="mb-1 text-xs font-medium text-neutral-300">{room.name}</p>
              <select
                value={room.floorMaterial}
                onChange={(e) => setRoomFloorMaterial(room.id, e.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-100"
              >
                {FLOOR_MATERIALS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
