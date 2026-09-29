import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
