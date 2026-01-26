import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "./",
  build: {
    outDir: "docs",
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        leaderboard: resolve(__dirname, 'leaderboard.html'),
        testDots: resolve(__dirname, 'test-dots.html')
      },
      output: {
        manualChunks: undefined
      }
    },
    copyPublicDir: false
  },
  publicDir: 'assets'
});
