# Floorplan 3D Studio

App per progettare planimetrie 2D, generarle automaticamente in un modello 3D
visitabile, arredarle e modificarle in qualsiasi momento.

## Stack

- Next.js (App Router) + TypeScript, Tailwind CSS
- Editor 2D: SVG nativo + React (nessuna libreria canvas esterna)
- Vista 3D: Three.js via React Three Fiber + drei
- Riconoscimento planimetria da immagine: euristica di rilevamento bordi scritta in TypeScript puro (nessuna dipendenza esterna, gira sempre nel browser)
- Persistenza: IndexedDB lato client (nessun backend/database server-side)

## Sviluppo locale

```bash
npm install
npm run dev
```

Apri http://localhost:3000.

```bash
npm run build   # build di produzione
npm run lint    # eslint
```

## Struttura

- `src/app` — routing (home / progetti, `/editor/[projectId]`)
- `src/components/editor2d` — editor 2D (muri, stanze, porte/finestre, snap, undo/redo)
- `src/components/viewer3d` — vista 3D, arredi, materiali, navigazione orbit/prima persona
- `src/components/recognition` — riconoscimento planimetria da immagine (euristica bordi in `src/lib/planHeuristic.ts`)
- `src/lib` — modello dati, store (Zustand), persistenza IndexedDB, geometria

## Note importanti

- I progetti sono salvati solo nel browser (IndexedDB): cambiare browser o
  svuotare i dati del sito perde i progetti.
- Il riconoscimento automatico da immagine è sempre una bozza: i muri/stanze
  proposti vanno rivisti e corretti manualmente prima di generare il 3D
  (mostrati tratteggiati/semitrasparenti finché la bozza non viene confermata).
  L'euristica rileva solo linee orizzontali/verticali (niente muri diagonali)
  e funziona meglio su disegni tecnici ad alto contrasto (scansioni,
  planimetrie in bianco e nero) che su foto rumorose.
- La modalità "Prima persona" usa la Pointer Lock API del browser per il
  mouse-look: funziona nei browser desktop standard ma non in iframe o
  contesti sandbox che bloccano il pointer lock.
