"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createEmptyProject, type ProjectSummary } from "@/lib/types";
import { deleteProject, listProjects, saveProject } from "@/lib/storage";

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    let active = true;
    listProjects().then((list) => {
      if (active) {
        setProjects(list);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }

  useEffect(refresh, []);

  async function handleCreate() {
    const project = createEmptyProject("Nuovo progetto");
    await saveProject(project);
    router.push(`/editor/${project.id}`);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Eliminare definitivamente questo progetto?")) return;
    await deleteProject(id);
    refresh();
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">
          Floorplan 3D Studio
        </h1>
        <p className="mt-2 text-neutral-400">
          Disegna la planimetria, generala in 3D, arredala e visitala.
        </p>

        <button
          onClick={handleCreate}
          className="mt-8 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-500"
        >
          + Nuovo progetto
        </button>

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
            Progetti salvati
          </h2>
          {loading && <p className="text-neutral-500">Caricamento...</p>}
          {!loading && projects.length === 0 && (
            <p className="text-neutral-500">
              Nessun progetto salvato. I progetti restano solo in questo
              browser (IndexedDB), non su un server.
            </p>
          )}
          <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800">
            {projects.map((p) => (
              <li
                key={p.id}
                onClick={() => router.push(`/editor/${p.id}`)}
                className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-neutral-900"
              >
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-neutral-500">
                    Aggiornato il {new Date(p.updatedAt).toLocaleString("it-IT")}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(p.id, e)}
                  className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-red-950 hover:text-red-400"
                >
                  Elimina
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
