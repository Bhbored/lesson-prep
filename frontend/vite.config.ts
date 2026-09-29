import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    proxy: {
      "/lessonprep": {
        target: "https://localhost:7132",
        changeOrigin: true,
        // ASP.NET Core uses a local development certificate.
        secure: false,
      },
    },
  },
});
