export interface FurnitureCatalogItem {
  id: string;
  label: string;
  category: string;
  /** footprint in meters, used for the 2D icon and default 3D scale reference */
  width: number;
  depth: number;
  height: number;
  color: string;
}

export const FURNITURE_CATALOG: FurnitureCatalogItem[] = [
  { id: "sofa", label: "Divano", category: "Soggiorno", width: 1.9, depth: 0.9, height: 0.8, color: "#8a6d5b" },
  { id: "armchair", label: "Poltrona", category: "Soggiorno", width: 0.8, depth: 0.8, height: 0.85, color: "#a17c5b" },
  { id: "coffee-table", label: "Tavolino", category: "Soggiorno", width: 1.0, depth: 0.5, height: 0.4, color: "#6b5843" },
  { id: "tv-stand", label: "Mobile TV", category: "Soggiorno", width: 1.4, depth: 0.4, height: 0.5, color: "#4a4a4a" },
  { id: "dining-table", label: "Tavolo da pranzo", category: "Cucina", width: 1.5, depth: 0.9, height: 0.75, color: "#7a5c3e" },
  { id: "chair", label: "Sedia", category: "Cucina", width: 0.45, depth: 0.45, height: 0.9, color: "#5b4636" },
  { id: "kitchen-counter", label: "Cucina componibile", category: "Cucina", width: 2.0, depth: 0.6, height: 0.9, color: "#d9d2c4" },
  { id: "bed-double", label: "Letto matrimoniale", category: "Camera", width: 1.6, depth: 2.0, height: 0.55, color: "#c7bba8" },
  { id: "wardrobe", label: "Armadio", category: "Camera", width: 1.2, depth: 0.6, height: 2.0, color: "#8f7a5f" },
  { id: "bookshelf", label: "Libreria", category: "Studio", width: 0.9, depth: 0.3, height: 1.9, color: "#6f5a42" },
  { id: "desk", label: "Scrivania", category: "Studio", width: 1.2, depth: 0.6, height: 0.75, color: "#7a6248" },
  { id: "floor-lamp", label: "Lampada da terra", category: "Accessori", width: 0.35, depth: 0.35, height: 1.5, color: "#c9a24b" },
  { id: "plant", label: "Pianta", category: "Accessori", width: 0.4, depth: 0.4, height: 1.2, color: "#4c7a3f" },
  { id: "bathtub", label: "Vasca da bagno", category: "Bagno", width: 1.7, depth: 0.75, height: 0.55, color: "#eef2f3" },
  { id: "toilet", label: "WC", category: "Bagno", width: 0.4, depth: 0.6, height: 0.4, color: "#eef2f3" },
];

export function getCatalogItem(id: string): FurnitureCatalogItem {
  return (
    FURNITURE_CATALOG.find((f) => f.id === id) ?? FURNITURE_CATALOG[0]
  );
}
