import { create } from "zustand";
import type {
  Project,
  Wall,
  Room,
  Opening,
  FurniturePlacement,
} from "./types";
import { createEmptyProject } from "./types";
import { saveProject } from "./storage";

const MAX_HISTORY = 60;

interface ProjectStore {
  project: Project;
  past: Project[];
  future: Project[];
  transactionSnapshot: Project | null;

  loadProject: (p: Project) => void;
  newProject: (name: string) => void;

  beginTransaction: () => void;
  endTransaction: () => void;
  cancelTransaction: () => void;

  addWall: (wall: Omit<Wall, "id">) => string;
  updateWallLive: (id: string, patch: Partial<Wall>) => void;
  updateWall: (id: string, patch: Partial<Wall>) => void;
  removeWall: (id: string) => void;
  removeWalls: (ids: string[]) => void;

  addRoom: (room: Omit<Room, "id">) => string;
  updateRoomLive: (id: string, patch: Partial<Room>) => void;
  updateRoom: (id: string, patch: Partial<Room>) => void;
  removeRoom: (id: string) => void;
  setRoomFloorMaterial: (id: string, materialId: string) => void;

  addOpening: (o: Omit<Opening, "id">) => string;
  updateOpeningLive: (id: string, patch: Partial<Opening>) => void;
  updateOpening: (id: string, patch: Partial<Opening>) => void;
  removeOpening: (id: string) => void;

  addFurniture: (f: Omit<FurniturePlacement, "id">) => string;
  updateFurnitureLive: (id: string, patch: Partial<FurniturePlacement>) => void;
  updateFurniture: (id: string, patch: Partial<FurniturePlacement>) => void;
  removeFurniture: (id: string) => void;

  setWallHeight: (h: number) => void;
  setWallMaterial: (id: string) => void;
  setGridSize: (g: number) => void;
  renameProject: (name: string) => void;

  applyRecognitionResult: (
    walls: Wall[],
    rooms: Room[],
    sourceImage?: Project["sourceImage"],
  ) => void;
  acceptRecognition: () => void;
  discardRecognition: () => void;

  undo: () => void;
  redo: () => void;
}

function persist(project: Project) {
  saveProject(project).catch((err) => {
    console.error("Failed to save project", err);
  });
}

export const useProjectStore = create<ProjectStore>()((set, get) => {
  function commit(mutator: (p: Project) => Project) {
    const current = get().project;
    const past = [...get().past, current].slice(-MAX_HISTORY);
    const next = { ...mutator(current), updatedAt: Date.now() };
    set({ project: next, past, future: [] });
    persist(next);
  }

  function mutateLive(mutator: (p: Project) => Project) {
    const next = { ...mutator(get().project), updatedAt: Date.now() };
    set({ project: next });
  }

  return {
    project: createEmptyProject("Nuovo progetto"),
    past: [],
    future: [],
    transactionSnapshot: null,

    loadProject: (p) => set({ project: p, past: [], future: [], transactionSnapshot: null }),
    newProject: (name) =>
      set({
        project: createEmptyProject(name),
        past: [],
        future: [],
        transactionSnapshot: null,
      }),

    beginTransaction: () => set({ transactionSnapshot: get().project }),
    endTransaction: () => {
      const snapshot = get().transactionSnapshot;
      const current = get().project;
      if (!snapshot) return;
      if (snapshot === current) {
        set({ transactionSnapshot: null });
        return;
      }
      const past = [...get().past, snapshot].slice(-MAX_HISTORY);
      set({ past, future: [], transactionSnapshot: null });
      persist(current);
    },
    cancelTransaction: () => {
      const snapshot = get().transactionSnapshot;
      if (snapshot) set({ project: snapshot });
      set({ transactionSnapshot: null });
    },

    addWall: (wall) => {
      const id = crypto.randomUUID();
      commit((p) => ({ ...p, walls: [...p.walls, { ...wall, id }] }));
      return id;
    },
    updateWallLive: (id, patch) =>
      mutateLive((p) => ({
        ...p,
        walls: p.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      })),
    updateWall: (id, patch) =>
      commit((p) => ({
        ...p,
        walls: p.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      })),
    removeWall: (id) =>
      commit((p) => ({
        ...p,
        walls: p.walls.filter((w) => w.id !== id),
        openings: p.openings.filter((o) => o.wallId !== id),
      })),
    removeWalls: (ids) =>
      commit((p) => ({
        ...p,
        walls: p.walls.filter((w) => !ids.includes(w.id)),
        openings: p.openings.filter((o) => !ids.includes(o.wallId)),
      })),

    addRoom: (room) => {
      const id = crypto.randomUUID();
      commit((p) => ({ ...p, rooms: [...p.rooms, { ...room, id }] }));
      return id;
    },
    updateRoomLive: (id, patch) =>
      mutateLive((p) => ({
        ...p,
        rooms: p.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      })),
    updateRoom: (id, patch) =>
      commit((p) => ({
        ...p,
        rooms: p.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      })),
    removeRoom: (id) =>
      commit((p) => ({ ...p, rooms: p.rooms.filter((r) => r.id !== id) })),
    setRoomFloorMaterial: (id, materialId) =>
      commit((p) => ({
        ...p,
        rooms: p.rooms.map((r) =>
          r.id === id ? { ...r, floorMaterial: materialId } : r,
        ),
      })),

    addOpening: (o) => {
      const id = crypto.randomUUID();
      commit((p) => ({ ...p, openings: [...p.openings, { ...o, id }] }));
      return id;
    },
    updateOpeningLive: (id, patch) =>
      mutateLive((p) => ({
        ...p,
        openings: p.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      })),
    updateOpening: (id, patch) =>
      commit((p) => ({
        ...p,
        openings: p.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      })),
    removeOpening: (id) =>
      commit((p) => ({
        ...p,
        openings: p.openings.filter((o) => o.id !== id),
      })),

    addFurniture: (f) => {
      const id = crypto.randomUUID();
      commit((p) => ({ ...p, furniture: [...p.furniture, { ...f, id }] }));
      return id;
    },
    updateFurnitureLive: (id, patch) =>
      mutateLive((p) => ({
        ...p,
        furniture: p.furniture.map((f) =>
          f.id === id ? { ...f, ...patch } : f,
        ),
      })),
    updateFurniture: (id, patch) =>
      commit((p) => ({
        ...p,
        furniture: p.furniture.map((f) =>
          f.id === id ? { ...f, ...patch } : f,
        ),
      })),
    removeFurniture: (id) =>
      commit((p) => ({
        ...p,
        furniture: p.furniture.filter((f) => f.id !== id),
      })),

    setWallHeight: (h) => commit((p) => ({ ...p, wallHeight: h })),
    setWallMaterial: (id) => commit((p) => ({ ...p, wallMaterial: id })),
    setGridSize: (g) => commit((p) => ({ ...p, gridSize: g })),
    renameProject: (name) => commit((p) => ({ ...p, name })),

    applyRecognitionResult: (walls, rooms, sourceImage) =>
      commit((p) => ({
        ...p,
        walls,
        rooms,
        openings: [],
        needsReview: true,
        sourceImage: sourceImage ?? p.sourceImage,
      })),
    acceptRecognition: () =>
      commit((p) => ({
        ...p,
        needsReview: false,
        walls: p.walls.map((w) => ({ ...w, confidence: undefined })),
        rooms: p.rooms.map((r) => ({ ...r, confidence: undefined })),
      })),
    discardRecognition: () =>
      commit((p) => ({
        ...p,
        walls: [],
        rooms: [],
        openings: [],
        needsReview: false,
        sourceImage: undefined,
      })),

    undo: () => {
      const past = get().past;
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      const future = [get().project, ...get().future];
      set({ project: previous, past: past.slice(0, -1), future });
      persist(previous);
    },
    redo: () => {
      const future = get().future;
      if (future.length === 0) return;
      const next = future[0];
      const past = [...get().past, get().project];
      set({ project: next, past, future: future.slice(1) });
      persist(next);
    },
  };
});

export function useCanUndo() {
  return useProjectStore((s) => s.past.length > 0);
}
export function useCanRedo() {
  return useProjectStore((s) => s.future.length > 0);
}
