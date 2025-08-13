import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// @ts-expect-error process is a nodejs global
const API_TARGET = process.env.VITE_WENBUN_SERVER_URL || "http://localhost:3000";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [sveltekit()],

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
    proxy: {
      // Anything starting with /api will be forwarded to API_TARGET
      // /api/auth    -> ${API_TARGET}/auth
      // /api/profile -> ${API_TARGET}/profile
      "^/api": {
         target: API_TARGET,
         changeOrigin: true,
         secure: false, // dev TODO
         // @ts-ignore
         rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
}));
