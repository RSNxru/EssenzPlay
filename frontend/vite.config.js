import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // En Docker no se define PORT (usa 5173); el preview del host inyecta PORT.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    // Proxy del API. Docker inyecta VITE_API_TARGET=http://backend:8000;
    // en el host caemos al backend publicado en :8090.
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET || "http://localhost:8090",
        changeOrigin: true,
      },
    },
  },
});
