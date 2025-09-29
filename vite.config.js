import { defineConfig } from "vite";
import { readFileSync } from 'fs';
import { sveltekit } from "@sveltejs/kit/vite";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";

const host = process.env.TAURI_DEV_HOST;
const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [
        sveltekit(),
        SvelteKitPWA({
            strategies: "injectManifest",
            // since you already have manifest.json in static/,
            // just point to it:
            manifest: false,
            // include favicon or other static assets if needed
            includeAssets: [
                "favicon.png", "wenbun-128.png", "wenbun-192.png", "wenbun-512.png", 
                "main.css", "assets/**",
            ],
            injectManifest: {
                globPatterns: [
                    "**/assets/**",
                ],
                    maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // bump if you have big files
                },
        }),
  ],
  define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
