import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      // Mọi request /api (localhost hoặc IP LAN :5173) đều chuyển tới Gateway trên máy dev
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
