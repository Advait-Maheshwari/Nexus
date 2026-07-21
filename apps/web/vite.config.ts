import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
  const isProductionBuild = command === "build";

  return {
    base: isProductionBuild ? process.env.VITE_BASE_PATH || "/" : "/",
    plugins: [
      react(),
      {
        name: "nexus-local-api-csp",
        transformIndexHtml(html) {
          if (isProductionBuild) return html;
          return html.replace(
            "connect-src 'self'",
            "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000"
          );
        }
      }
    ],
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
  };
});
