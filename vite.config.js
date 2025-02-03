import { resolve, dirname } from "node:path"
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from '@testing-library/svelte/vite'
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url))

/// <reference types="vitest/config" />
export default defineConfig({
  build: {
    sourcemap: true,
    outDir: "./dist/app/"
  },
  resolve: {
    alias: {
      "$lib": resolve(__dirname, "./src/lib"),
    },
  },
  plugins: [svelte(), svelteTesting()],
  test: {
    setupFiles: ["./test.setup.js"],
    environment: "jsdom"
  }
});
