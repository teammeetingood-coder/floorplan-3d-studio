"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProjectStore } from "@/lib/store";
import { loadProject } from "@/lib/storage";
import EditorShell from "@/components/EditorShell";

export default function EditorPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const loadProjectIntoStore = useProjectStore((s) => s.loadProject);
  const [status, setStatus] = useState<"loading" | "not-found" | "ready">(
    "loading",
  );

  useEffect(() => {
    let active = true;
    loadProject(params.projectId).then((project) => {
      if (!active) return;
      if (!project) {
        setStatus("not-found");
        return;
      }
      loadProjectIntoStore(project);
      setStatus("ready");
    });
    return () => {
      active = false;
    };
  }, [params.projectId, loadProjectIntoStore]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950 text-neutral-400">
        Caricamento progetto...
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-300">
        <p>Progetto non trovato.</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
        >
          Torna alla home
        </button>
      </div>
    );
  }

  return <EditorShell />;
}
