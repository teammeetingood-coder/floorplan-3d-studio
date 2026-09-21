import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // OpenCV.js's WASM build uses threads internally; without cross-origin
        // isolation the browser falls back to a much slower/blocking init path
        // (this is what made the plan-recognition modal freeze the tab).
        // "credentialless" (not "require-corp") is used for COEP so the
        // third-party CDN script can still load without needing to opt in
        // with its own CORP/CORS headers.
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

export default nextConfig;
