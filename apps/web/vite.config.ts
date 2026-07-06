import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? process.env.VITE_BASE_PATH || "/" : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@nexus/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts")
    }
  },
  build: {
    chunkSizeWarningLimit: 1400
  },
  server: {
    port: 5173
  }
}));
