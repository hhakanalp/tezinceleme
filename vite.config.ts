import { defineConfig } from "vite";

const API_PORT = process.env.THESIS_API_PORT || 3456;

export default defineConfig({
  build: {
    sourcemap: true
  },
  server: {
    proxy: {
      "/api/check-thesis": {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
        rewrite: () => "/"
      }
    }
  },
  preview: {
    proxy: {
      "/api/check-thesis": {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
        rewrite: () => "/"
      }
    }
  }
});
