import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root,
  base: "./",
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: { "@": resolve(root, "src") },
  },
  build: {
    outDir: "android-web",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(root, "android.html"),
    },
  },
});
