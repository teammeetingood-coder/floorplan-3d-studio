"use client";

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useProjectStore } from "@/lib/store";
import Scene from "./Scene";
import FirstPersonControls from "./FirstPersonControls";
import FurniturePanel from "./FurniturePanel";
import MaterialsPanel from "./MaterialsPanel";

type CameraMode = "orbit" | "firstperson";
type PanelTab = "furniture" | "materials";

export default function Viewer3D() {
  const project = useProjectStore((s) => s.project);
  const [cameraMode, setCameraMode] = useState<CameraMode>("orbit");
  const [panelTab, setPanelTab] = useState<PanelTab>("furniture");
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [furnitureDragging, setFurnitureDragging] = useState(false);

  const center = useMemo(() => {
    const points = project.walls.flatMap((w) => [w.a, w.b]);
    if (points.length === 0) return { x: 0, z: 0 };
    const x = points.reduce((s, p) => s + p.x, 0) / points.length;
    const z = points.reduce((s, p) => s + p.y, 0) / points.length;
    return { x, z };
  }, [project.walls]);

  return (
    <div className="flex h-full w-full">
      <div className="relative flex-1">
        {project.walls.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <p className="rounded-md bg-neutral-900/90 px-4 py-3 text-sm text-neutral-400">
              Disegna almeno un muro nell&apos;editor 2D per generare il modello 3D.
            </p>
          </div>
        )}

        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          <div className="flex rounded-md border border-neutral-700 bg-neutral-900/95 p-0.5">
            <button
              onClick={() => setCameraMode("orbit")}
              className={`rounded px-3 py-1.5 text-sm ${
                cameraMode === "orbit" ? "bg-blue-600 text-white" : "text-neutral-300"
              }`}
            >
              Orbit / dall&apos;alto
            </button>
            <button
              onClick={() => setCameraMode("firstperson")}
              className={`rounded px-3 py-1.5 text-sm ${
                cameraMode === "firstperson" ? "bg-blue-600 text-white" : "text-neutral-300"
              }`}
            >
              Prima persona (WASD)
            </button>
          </div>
          {cameraMode === "firstperson" && (
            <span className="rounded-md bg-neutral-900/90 px-3 py-1.5 text-xs text-neutral-400">
              Clicca nella scena per attivare il mouse look. Esc per uscire.
            </span>
          )}
        </div>

        <Canvas
          shadows
          camera={{ position: [center.x + 6, 6, center.z + 6], fov: 55 }}
          className="!h-full !w-full"
        >
          <color attach="background" args={["#11141a"]} />
          <Scene
            selectedFurnitureId={selectedFurnitureId}
            onSelectFurniture={setSelectedFurnitureId}
            dragEnabled={cameraMode === "orbit"}
            onDraggingChange={setFurnitureDragging}
          />
          {cameraMode === "orbit" && (
            <OrbitControls
              makeDefault
              enabled={!furnitureDragging}
              target={[center.x, 1, center.z]}
              maxPolarAngle={Math.PI / 2 - 0.02}
            />
          )}
          {cameraMode === "firstperson" && <FirstPersonControls startX={center.x} startZ={center.z} />}
        </Canvas>
      </div>

      <div className="flex flex-col">
        <div className="flex border-b border-neutral-800 bg-neutral-900">
          <button
            onClick={() => setPanelTab("furniture")}
            className={`flex-1 px-3 py-2 text-sm ${
              panelTab === "furniture" ? "border-b-2 border-blue-500 text-white" : "text-neutral-400"
            }`}
          >
            Arredi
          </button>
          <button
            onClick={() => setPanelTab("materials")}
            className={`flex-1 px-3 py-2 text-sm ${
              panelTab === "materials" ? "border-b-2 border-blue-500 text-white" : "text-neutral-400"
            }`}
          >
            Materiali
          </button>
        </div>
        {panelTab === "furniture" ? (
          <FurniturePanel selectedId={selectedFurnitureId} onSelect={setSelectedFurnitureId} />
        ) : (
          <MaterialsPanel />
        )}
      </div>
    </div>
  );
}
