// OpenCV.js is a ~8-9MB WASM build. We load it lazily from a CDN, only when the
// user opens the plan-recognition flow, instead of bundling it into the app.
//
// This runs on the main thread rather than in a Web Worker: OpenCV.js's threaded
// WASM runtime hung indefinitely when initialized from inside a Worker in testing
// (no error, Module.onRuntimeInitialized never fired), while the main thread works
// reliably. Responsiveness is instead handled by downscaling the image before
// processing (see resizeImageForProcessing in recognizePlan.ts), which keeps the
// actual Canny/Hough run well under a second.
const OPENCV_SRC = "https://docs.opencv.org/4.13.0/opencv.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CvModule = any;

let loadingPromise: Promise<CvModule> | null = null;

export function loadOpenCv(): Promise<CvModule> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("OpenCV can only be loaded in the browser"));
  }
  const existing = (window as unknown as { cv?: CvModule }).cv;
  if (existing?.Mat) return Promise.resolve(existing);

  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise<CvModule>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = OPENCV_SRC;
    script.async = true;
    script.onload = () => {
      const cv = (window as unknown as { cv?: CvModule }).cv;
      if (!cv) {
        reject(new Error("OpenCV.js caricato ma non disponibile su window.cv"));
        return;
      }
      if (cv.Mat) {
        resolve(cv);
      } else {
        cv.onRuntimeInitialized = () => resolve(cv);
      }
    };
    script.onerror = () => reject(new Error("Impossibile caricare OpenCV.js dalla CDN"));
    document.body.appendChild(script);
  });

  return loadingPromise;
}
